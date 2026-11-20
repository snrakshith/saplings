import { defineSaplingConfig } from '@saplings/sdk';
import { backendQualityProfile } from './quality-profile.ts';
import type { HttpRequest } from '@saplings/security';

/** Demonstration ONLY. Replace the resolver with verified JWT/OIDC/service auth. */
export default defineSaplingConfig({
  quality: backendQualityProfile(),
  app: { id: 'sapling-express-example', environment: 'development' },
  tenancy: { enabled: true, enforceContext: true },
  access: { enabled: true, enforceOnServices: true, defaultDecision: 'deny' },
  security: {
    scanner: { enabled: true },
    defender: {
      enabled: true,
      mode: 'block',
      blockThreshold: 80,
      rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
      onAlert(event) {
        console.warn(
          '[security alert]',
          event.riskScore,
          event.signals.map((s) => s.id),
        );
      },
    },
  },
  storage: { provider: 'memory', maxUploadBytes: 1048576 },
  payments: { provider: 'cashfree', enabled: false },
  notifications: { provider: 'custom' },
  audit: { enabled: true },
  billing: { enabled: true },
  featureFlags: { enabled: true },
  workflows: { enabled: true },
  hooks: {
    resolveRequestContext(req: HttpRequest) {
      // DO NOT copy this hard-coded token into a production application.
      if (req.headers.authorization === 'Bearer local-development-only-token')
        return {
          tenantId: 'demo-tenant',
          actorId: 'demo-admin',
          permissions: ['*'],
          roles: ['admin'],
        };
      return undefined;
    },
  },
});
