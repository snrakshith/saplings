import { saasFeatures } from '@saplings/catalog';
import type { ActorContext, JsonRecord, FeatureSettings, FeatureAdapter } from './types.js';
import { SaplingError } from './types.js';
import { AccessService } from './access.js';
import { object } from './primitives.js';
/** Uniform extension point for the whole SaaS catalog. Production capability behavior
 *  must come from an actual adapter, never merely from a feature flag. */
export class CapabilityService {
  constructor(
    private settings: Record<string, FeatureSettings>,
    private adapters: Record<string, FeatureAdapter>,
    private access: AccessService,
    private actions: Record<string, string[]> = {},
    private providerRequired: string[] = [],
    private configured: string[] = [],
    private guard?: (ctx: ActorContext, id: string) => Promise<void>,
  ) {}
  get(id: string) {
    const feature = saasFeatures.find((f) => f.id === id);
    if (!feature) throw new SaplingError('UNKNOWN_FEATURE', `Unknown feature: ${id}`);
    return {
      ...feature,
      ...(this.settings[id] ?? {}),
      providerConfigured: this.configured.includes(id),
      available: !this.providerRequired.includes(id) || this.configured.includes(id),
    };
  }
  list() {
    return saasFeatures.map((feature) => this.get(feature.id));
  }
  async invoke(
    ctx: ActorContext,
    id: string,
    action: string,
    input: JsonRecord = {},
  ): Promise<unknown> {
    const feature = this.get(id);
    input = object(input);
    if (!ctx.tenantId || !ctx.actorId || ctx.tenantId.startsWith('__sapling_'))
      throw new SaplingError('INVALID_CONTEXT', 'Verified tenant and actor required', 403);
    await this.guard?.(ctx, id);
    if (feature.enabled === false)
      throw new SaplingError('FEATURE_DISABLED', `Feature ${id} disabled`, 403);
    if (this.actions[id] && !this.actions[id].includes(action))
      throw new SaplingError('UNKNOWN_ACTION', 'Unknown capability action', 404);
    if (ctx.impersonatorId)
      throw new SaplingError(
        'FORBIDDEN',
        'Support sessions may only access explicitly permitted read service routes',
        403,
      );
    await this.access.requireService(ctx, `capabilities:${id}:${action}`);
    const policy = this.settings[id]?.actions?.[action];
    if (policy?.inputSchema) {
      const parsed = await policy.inputSchema.safeParseAsync(input);
      if (!parsed.success)
        throw new SaplingError('INVALID_INPUT', 'Feature input schema rejected request', 400);
      input = object(parsed.data);
    }
    if (policy?.authorize && (await policy.authorize(ctx, structuredClone(input))) !== true)
      throw new SaplingError('FORBIDDEN', 'Feature action policy denied request', 403);
    const adapter = this.adapters[id];
    if (!adapter)
      throw new SaplingError(
        'NOT_CONFIGURED',
        `Feature ${id} needs an explicit capability adapter`,
      );
    const result = await adapter.execute({
      ctx,
      featureId: id,
      action,
      input,
      options: feature.options ?? {},
    });
    if (policy?.outputSchema) {
      const parsed = await policy.outputSchema.safeParseAsync(result);
      if (!parsed.success)
        throw new SaplingError('INVALID_OUTPUT', 'Feature output schema rejected result', 502);
      return parsed.data;
    }
    return result;
  }
}
