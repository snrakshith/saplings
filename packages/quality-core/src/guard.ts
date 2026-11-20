import type { QualityConfig, RunContext, SuiteId } from './types.js';
const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
export function assertTargetAllowed(config: QualityConfig, target: string): void {
  const url = new URL(target);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Only HTTP(S) targets without URL credentials are allowed');
  if (config.allowedHosts?.includes(url.hostname) || LOCAL.has(url.hostname)) return;
  throw new Error(
    `Target host ${url.hostname} is not allowlisted. Add it to allowedHosts explicitly.`,
  );
}
export function assertSafeRun(ctx: RunContext, suite: SuiteId, destructive = false): void {
  const section = suite.startsWith('backend:') ? ctx.config.backend : ctx.config.frontend;
  if (!section) throw new Error(`Missing configuration for ${suite}`);
  assertTargetAllowed(ctx.config, section.baseUrl);
  if (ctx.config.environment === 'production' && !ctx.config.safety?.allowProductionTarget) {
    throw new Error(
      'Production targeting is disabled. Set safety.allowProductionTarget only after review.',
    );
  }
  if (ctx.config.environment === 'staging' && process.env.SAPLING_QUALITY_CONFIRM !== 'yes')
    throw new Error('Staging requires SAPLING_QUALITY_CONFIRM=yes');
  if (
    ctx.config.environment === 'production' &&
    (ctx.updateBaselines ||
      suite === 'frontend:visual' ||
      suite === 'frontend:api-integration' ||
      suite === 'frontend:network' ||
      suite === 'backend:security' ||
      suite === 'backend:profiling')
  )
    throw Error('This quality suite is restricted to non-production targets');
  if (!destructive) return;
  if (ctx.config.environment === 'production')
    throw new Error('Destructive tests are blocked in production, without exception.');
  if (!ctx.allowDestructive || !ctx.config.safety?.allowDestructive)
    throw new Error(`${suite} requires --allow-destructive and safety.allowDestructive=true`);
  const ns = ctx.config.backend?.kubernetes?.namespace;
  if (['default', 'kube-system', 'kube-public', 'production', 'prod'].includes(ns ?? ''))
    throw new Error(
      'Destructive Kubernetes experiments require a dedicated non-production namespace',
    );
}
export function assertWorkloadLimit(config: QualityConfig, vus: number): void {
  const max = config.safety?.maxVirtualUsers ?? 100;
  if (!Number.isFinite(vus) || vus <= 0 || vus > max)
    throw new Error(`Requested VUs (${vus}) must be between 1 and allowed maximum (${max})`);
}
