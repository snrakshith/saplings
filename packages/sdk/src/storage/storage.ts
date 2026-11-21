import { randomUUID } from 'node:crypto';
import type { StorageAdapter, ActorContext } from '../types.js';
import { SaplingError } from '../types.js';
import { AccessService } from '../identity/access.js';
import { AuditService } from '../audit/audit.js';
interface Version {
  version: string;
  data: Uint8Array;
  metadata: Record<string, string>;
}
function cleanKey(key: string) {
  if (
    !key ||
    key.length > 1024 ||
    key.startsWith('/') ||
    key.includes('\\') ||
    key.split('/').some((s) => s === '..' || s === '.' || !s) ||
    /[\x00-\x1f]/.test(key)
  )
    throw new SaplingError('BAD_OBJECT_KEY', 'Unsafe object key');
  return key;
}
export class InMemoryStorage implements StorageAdapter {
  private data = new Map<string, Version[]>();
  private key(tenant: string, key: string) {
    return JSON.stringify([tenant, cleanKey(key)]);
  }
  async put(
    tenantId: string,
    key: string,
    data: Uint8Array,
    metadata: Record<string, string> = {},
  ) {
    const version = randomUUID(),
      k = this.key(tenantId, key),
      versions = this.data.get(k) ?? [];
    versions.push({ version, data: new Uint8Array(data), metadata: { ...metadata } });
    this.data.set(k, versions);
    return { key, version, size: data.byteLength };
  }
  async get(tenantId: string, key: string, version?: string) {
    const versions = this.data.get(this.key(tenantId, key)) ?? [];
    const item = version ? versions.find((v) => v.version === version) : versions.at(-1);
    return item
      ? { version: item.version, data: new Uint8Array(item.data), metadata: { ...item.metadata } }
      : undefined;
  }
  async list(tenantId: string, prefix = '') {
    const result: { key: string; version: string; size: number }[] = [];
    for (const [encoded, versions] of this.data) {
      const [tenant, key] = JSON.parse(encoded) as [string, string];
      if (tenant !== tenantId || !key.startsWith(prefix)) continue;
      const latest = versions.at(-1);
      if (latest) result.push({ key, version: latest.version, size: latest.data.byteLength });
    }
    return result;
  }
  async delete(tenantId: string, key: string) {
    this.data.delete(this.key(tenantId, key));
  }
}
export class StorageService {
  constructor(
    private provider: StorageAdapter,
    private access: AccessService,
    private audit: AuditService,
    private maxBytes: number,
    private authorizeObject?: NonNullable<
      import('../types.js').SaplingConfig['storage']
    >['authorizeObject'],
  ) {}
  private async requireObject(
    ctx: ActorContext,
    action: 'read' | 'write' | 'delete' | 'list',
    key: string,
  ) {
    if (this.authorizeObject && !(await this.authorizeObject(ctx, action, key)))
      throw new SaplingError('FORBIDDEN', 'Object access denied', 403);
  }
  async upload(
    ctx: ActorContext,
    input: { key: string; data: Uint8Array; metadata?: Record<string, string> },
  ) {
    await this.access.requireService(ctx, 'storage:write');
    await this.requireObject(ctx, 'write', cleanKey(input.key));
    if (input.data.byteLength > this.maxBytes)
      throw new SaplingError('FILE_TOO_LARGE', 'Upload exceeds configured maximum', 413);
    const result = await this.provider.put(
      ctx.tenantId,
      cleanKey(input.key),
      input.data,
      input.metadata,
    );
    await this.audit.record(ctx, 'storage.uploaded', 'storage', input.key, {
      bytes: input.data.byteLength,
      version: result.version,
    });
    return result;
  }
  async download(ctx: ActorContext, key: string, version?: string) {
    await this.access.requireService(ctx, 'storage:read');
    await this.requireObject(ctx, 'read', cleanKey(key));
    return this.provider.get(ctx.tenantId, cleanKey(key), version);
  }
  async list(ctx: ActorContext, prefix = '') {
    await this.access.requireService(ctx, 'storage:read');
    await this.requireObject(ctx, 'list', prefix);
    const results = await this.provider.list(ctx.tenantId, prefix);
    if (!this.authorizeObject) return results;
    const visible = [];
    for (const item of results)
      if (await this.authorizeObject(ctx, 'read', item.key)) visible.push(item);
    return visible;
  }
  async delete(ctx: ActorContext, key: string) {
    await this.access.requireService(ctx, 'storage:delete');
    await this.requireObject(ctx, 'delete', cleanKey(key));
    await this.provider.delete(ctx.tenantId, cleanKey(key));
    await this.audit.record(ctx, 'storage.deleted', 'storage', key);
  }
}
