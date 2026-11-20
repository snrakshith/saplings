import { createSapling, defineSaplingConfig, type SaplingConfig } from '@saplings/sdk';
import {
  Gateway,
  MemoryRateLimitStore,
  type GatewayConfig,
  type GatewayDependencies,
} from '@saplings/harbor';
import { IdentityPlatform, type RealmConfig, type IdentityDependencies } from '@saplings/kingsman';
declare const gateway: GatewayConfig, realm: RealmConfig;
const cfg = defineSaplingConfig({
  app: { id: 'platform', environment: 'test' },
  platforms: {
    gateway: { config: gateway, dependencies: { rateLimit: new MemoryRateLimitStore() } },
    identity: { config: realm, dependencies: {} },
  },
});
const sapling = createSapling(cfg);
const optionalGateway: Gateway | undefined = sapling.gateway;
const optionalIdentity: IdentityPlatform | undefined = sapling.identityPlatform;
const wrong: GatewayDependencies = { verifyJwt: async () => ({ sub: 'subject' }) };
void [optionalGateway, optionalIdentity, wrong];
// @ts-expect-error realm package type cannot be used for gateway config
const invalid: GatewayConfig = realm;
// @ts-expect-error gateway package type cannot be used for realm config
const invalidRealm: RealmConfig = gateway;

const renamed = defineSaplingConfig({
  app: { id: 'renamed', environment: 'test' },
  platforms: {
    harbor: { config: gateway, dependencies: { keyTenantForRequest: async () => undefined } },
    kingsman: { config: realm, dependencies: {} },
  },
});
const sdk017 = createSapling(renamed);
const harbor: Gateway | undefined = sdk017.harbor;
const kingsman: IdentityPlatform | undefined = sdk017.kingsman;
const invalidHarbor = defineSaplingConfig({
  app: { id: 'invalid', environment: 'test' },
  // @ts-expect-error Harbor must not accept a Kingsman RealmConfig
  platforms: { harbor: { config: realm } },
});
void [harbor, kingsman, invalidHarbor];
