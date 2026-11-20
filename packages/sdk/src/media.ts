import type { FeatureAdapter, StorageAdapter } from './types.js';
import { fail, hash, integer, text } from './primitives.js';
import type { Store } from './types.js';
import { Bulkhead } from './reliability.js';
export interface ImageTransformer {
  transform(
    input: Uint8Array,
    settings: { width: number; height: number; format: 'webp' | 'png' | 'jpeg' },
  ): Promise<Uint8Array>;
}
export class MediaCapabilityAdapter implements FeatureAdapter {
  private bulk = new Bulkhead(4);
  constructor(
    private store: Store,
    private storage: StorageAdapter,
    private processor: ImageTransformer,
    private maxBytes = 10 * 1024 * 1024,
  ) {}
  async execute({ ctx, featureId, action, input }: Parameters<FeatureAdapter['execute']>[0]) {
    if (featureId !== 'SAAS-095') return fail('Unsupported media operation');
    if (action === 'status') return this.store.get(ctx.tenantId, 'media-jobs', text(input.id));
    if (action !== 'transform') return fail('Unknown media action');
    const source = text(input.key),
      width = integer(input.width, 'width', 1, 4096),
      height = integer(input.height, 'height', 1, 4096),
      format = text(input.format);
    if (!['webp', 'png', 'jpeg'].includes(format)) return fail('Unsupported image format');
    const src = await this.storage.get(ctx.tenantId, source);
    if (!src || src.data.byteLength > this.maxBytes) return fail('Invalid source image');
    const id = hash(JSON.stringify([source, src.version, width, height, format]));
    return this.bulk.run(async () => {
      const old = await this.store.get(ctx.tenantId, 'media-jobs', id);
      if (old) return old;
      const result = await this.processor.transform(src.data, {
        width,
        height,
        format: format as 'webp' | 'png' | 'jpeg',
      });
      if (result.byteLength > this.maxBytes) return fail('Output too large');
      const key = `transformed/${id}.${format}`;
      await this.storage.put(ctx.tenantId, key, result, { sourceVersion: src.version });
      const row = { id, key, status: 'complete', bytes: result.byteLength };
      await this.store.put(ctx.tenantId, 'media-jobs', row);
      return row;
    });
  }
}
