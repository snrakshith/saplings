import type {
  BackendQualityConfig,
  QualitySuiteConfig,
  QualityCategory,
  QualityEngine,
} from '@saplings/sdk';
export type { BackendQualityConfig, QualitySuiteConfig, QualityCategory, QualityEngine };
export const categories = [
  'performance',
  'load',
  'stress',
  'spike',
  'soak',
  'scalability',
  'security',
  'concurrency',
  'resilience',
  'recovery',
  'observability',
  'contract',
  'chaos',
  'disaster-recovery',
  'kubernetes',
] as const satisfies readonly QualityCategory[];
const engines = [
  'native',
  'k6',
  'autocannon',
  'toxiproxy',
  'zap',
  'schemathesis',
  'testcontainers',
  'chaos-mesh',
  'kubectl',
  'vitest',
  'node-test',
];
export function defineQualityConfig<T extends BackendQualityConfig>(config: T): T {
  validate(config);
  return config;
}
export function validate(c: BackendQualityConfig) {
  if (
    !c ||
    !['local', 'staging'].includes(c.environment) ||
    !Array.isArray(c.allowedOrigins) ||
    !c.allowedOrigins.length ||
    !c.targets ||
    !Array.isArray(c.suites)
  )
    throw Error('Quality requires environment, explicit origins, targets and suites');
  const origins = new Set(
    c.allowedOrigins.map((o) => {
      const u = new URL(o);
      if (u.origin !== o || !['http:', 'https:'].includes(u.protocol) || u.username || u.password)
        throw Error('Invalid allowed origin');
      if (c.environment === 'local' && !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname))
        throw Error('Local runs require loopback');
      return o;
    }),
  );
  for (const target of Object.values(c.targets)) {
    const u = new URL(target);
    if (
      !origins.has(u.origin) ||
      u.username ||
      u.password ||
      u.hash ||
      u.search ||
      u.pathname !== '/'
    )
      throw Error('Target must be an approved bare origin');
  }
  const bounded = (n: number | undefined, min: number, max: number, label: string) => {
    if (n !== undefined && (!Number.isSafeInteger(n) || n < min || n > max))
      throw Error('Invalid ' + label);
  };
  bounded(c.maxConcurrency, 1, 1000, 'maxConcurrency');
  bounded(c.maxDurationSeconds, 1, 86400, 'maxDurationSeconds');
  const compatible: Record<QualityCategory, readonly string[]> = {
    performance: ['native', 'k6', 'autocannon'],
    load: ['native', 'k6', 'autocannon'],
    stress: ['native', 'k6', 'autocannon'],
    spike: ['native', 'k6'],
    soak: ['native', 'k6'],
    scalability: ['kubectl', 'vitest', 'node-test', 'k6'],
    security: ['zap', 'vitest', 'node-test'],
    concurrency: ['native', 'k6', 'vitest', 'node-test', 'testcontainers'],
    resilience: ['toxiproxy', 'vitest', 'node-test'],
    recovery: ['vitest', 'node-test', 'testcontainers'],
    observability: ['vitest', 'node-test', 'native'],
    contract: ['schemathesis', 'vitest', 'node-test'],
    chaos: ['chaos-mesh'],
    'disaster-recovery': ['vitest', 'node-test', 'testcontainers'],
    kubernetes: ['kubectl', 'vitest', 'node-test'],
  };
  const ids = new Set<string>();
  for (const s of c.suites) {
    if (
      !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(s.id) ||
      ids.has(s.id) ||
      !categories.includes(s.category) ||
      !engines.includes(s.engine)
    )
      throw Error('Invalid or duplicate suite: ' + s.id);
    ids.add(s.id);
    if (!compatible[s.category].includes(s.engine))
      throw Error('Engine incompatible with category: ' + s.id);
    if (s.target !== undefined && !Object.hasOwn(c.targets, s.target))
      throw Error('Unknown target: ' + s.target);
    if (['native', 'k6', 'autocannon', 'zap', 'schemathesis'].includes(s.engine) && !s.target)
      throw Error('Target required: ' + s.id);
    bounded(s.concurrency, 1, c.maxConcurrency ?? 100, 'concurrency');
    bounded(s.requests, 1, 1000000, 'requests');
    bounded(s.durationSeconds, 1, c.maxDurationSeconds ?? 3600, 'duration');
    bounded(s.timeoutMs, 100, 86400000, 'timeout');
    let duration = 0;
    for (const stage of s.stages ?? []) {
      bounded(stage.concurrency, 1, c.maxConcurrency ?? 100, 'stage concurrency');
      bounded(stage.seconds, 1, c.maxDurationSeconds ?? 3600, 'stage seconds');
      duration += stage.seconds;
    }
    if (duration > (c.maxDurationSeconds ?? 3600)) throw Error('Stage duration limit');
    for (const p of s.probes ?? []) {
      if (
        !p.path.startsWith('/') ||
        p.path.startsWith('//') ||
        p.path.includes('\\') ||
        /[\r\n]/.test(p.path) ||
        p.statuses?.some((x) => !Number.isInteger(x) || x < 100 || x > 599)
      )
        throw Error('Invalid probe');
    }
    for (const [k, v] of Object.entries(s.thresholds ?? {})) {
      if (
        !['maxP95Ms', 'maxP99Ms', 'maxErrorRate', 'minRequestsPerSecond'].includes(k) ||
        !Number.isFinite(v) ||
        v < 0 ||
        (k === 'maxErrorRate' && v > 1)
      )
        throw Error('Invalid threshold ' + k);
    }
    if (
      s.namespace &&
      (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(s.namespace) ||
        s.namespace.length > 63 ||
        !c.allowedNamespaces?.includes(s.namespace))
    )
      throw Error('Namespace not approved');
    if (
      s.deployment &&
      (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(s.deployment) ||
        s.deployment.length > 63 ||
        !c.allowedDeployments?.includes(s.deployment))
    )
      throw Error('Deployment not approved');
    bounded(s.replicas, 1, 100, 'replicas');
  }
  return c;
}
export function isDisruptive(s: QualitySuiteConfig) {
  return (
    s.disrupts === true ||
    [
      'stress',
      'spike',
      'chaos',
      'disaster-recovery',
      'recovery',
      'scalability',
      'resilience',
    ].includes(s.category) ||
    ['toxiproxy', 'chaos-mesh', 'schemathesis'].includes(s.engine) ||
    s.replicas !== undefined
  );
}
export function assertRunAllowed(c: BackendQualityConfig, s: QualitySuiteConfig) {
  if (c.enabled === false || s.enabled === false) throw Error('Suite disabled');
  if (c.environment === 'staging' && process.env.SAPLING_QUALITY_CONFIRM !== 'yes')
    throw Error('Staging execution requires SAPLING_QUALITY_CONFIRM=yes');
  if (isDisruptive(s) && !(c.allowDisruptive && process.env.SAPLING_QUALITY_DISRUPTIVE === 'yes'))
    throw Error('Disruptive suite requires explicit approval');
  if (['kubectl', 'chaos-mesh'].includes(s.engine) && (!s.namespace || c.environment !== 'staging'))
    throw Error('Kubernetes tools require authorized staging namespace');
}
