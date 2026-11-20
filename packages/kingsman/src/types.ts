import type { IncomingMessage } from 'node:http';
import type { KeyObject } from 'node:crypto';
export interface RealmClient {
  clientId: string;
  enabled?: boolean;
  accessType: 'public' | 'confidential';
  protocol?: string;
  authenticator?: string;
  secret?: string;
  jwksUri?: string;
  grants?: {
    authorizationCode?: boolean;
    refreshToken?: boolean;
    clientCredentials?: boolean;
    password?: boolean;
    deviceCode?: boolean;
    tokenExchange?: boolean;
  };
  pkce?: string;
  redirectUris?: string[];
  postLogoutRedirectUris?: string[];
  webOrigins?: string[];
  scopes?: { default?: string[]; optional?: string[] };
  roles?: { name: string }[];
  serviceAccount?: Record<string, unknown>;
  overrides?: { accessToken?: { ttl?: string } };
}
export interface RealmConfig {
  apiVersion: 'identity.sapling.dev/v1alpha1';
  kind: 'RealmConfig';
  metadata: { name: string; environment?: string; displayName?: string };
  spec: {
    state?: 'active' | 'inactive';
    secretStoreRefs?: string[];
    frontend: { issuer: string; hostnames?: string[]; sslRequired?: string };
    keys: {
      providers: {
        name: string;
        type: string;
        algorithm?: string;
        keySize?: number;
        priority?: number;
        active?: boolean;
      }[];
      rotation?: Record<string, unknown>;
    };
    tokens: {
      defaultSignatureAlgorithm: string;
      accessToken: { ttl: string };
      idToken?: { ttl: string };
      refreshToken: { ttl: string; rotate?: boolean; reuseDetection?: string };
      authorizationCode?: { ttl?: string };
    };
    sessions: {
      store?: string;
      sso: { idle: string; max: string };
      rememberMe?: { enabled?: boolean; idle: string; max: string };
    };
    security: {
      passwordPolicy: {
        hashAlgorithm: string;
        minLength: number;
        maxLength?: number;
        require?: { digits?: number; uppercase?: number; lowercase?: number; symbols?: number };
        notUsername?: boolean;
        notEmail?: boolean;
        history?: number;
        breachedPasswordCheck?: boolean;
      };
      bruteForce?: {
        enabled?: boolean;
        failureFactor?: number;
        waitIncrement?: string;
        maxWait?: string;
        failureReset?: string;
        permanentLockoutAfter?: number;
      };
      otpPolicy?: {
        type: string;
        algorithm?: string;
        digits?: number;
        period?: string;
        lookAhead?: number;
      };
      webAuthnPolicy?: unknown;
      webauthnPolicy?: unknown;
    };
    registration?: {
      enabled?: boolean;
      mode?: string;
      allowedEmailDomains?: string[];
      emailAsUsername?: boolean;
      loginWithEmail?: boolean;
      verifyEmail?: boolean;
      resetPasswordAllowed?: boolean;
      autoLoginAfterRegister?: boolean;
    };
    userProfile?: {
      attributes?: {
        name: string;
        required?: { roles?: string[] };
        permissions?: { view?: string[]; edit?: string[] };
        validations?: Record<string, unknown>;
        sensitive?: boolean;
      }[];
    };
    requiredActions?: { alias: string; enabled: boolean }[];
    authenticationFlows?: {
      alias: string;
      steps: {
        authenticator?: string;
        subFlow?: string;
        requirement: string;
        condition?: Record<string, unknown>;
      }[];
    }[];
    flowBindings?: Record<string, string>;
    organizations?: {
      enabled?: boolean;
      membership?: string;
      invitations?: { enabled?: boolean; ttl?: string; allowedEmailDomainsFromOrg?: boolean };
      roles?: { name: string }[];
      defaultRole?: string;
    };
    roles?: {
      realm?: { name: string; composites?: { realm?: string[] } }[];
      defaultRoles?: string[];
    };
    groups?: {
      name: string;
      roles?: { realm?: string[] };
      children?: { name: string; roles?: { realm?: string[] } }[];
    }[];
    defaultGroups?: string[];
    clientScopes?: { name: string; protocol?: string; mappers?: unknown[] }[];
    defaultClientScopes?: { default?: string[]; optional?: string[] };
    clients: RealmClient[];
    clientPolicies?: Record<string, unknown>;
    identityProviders?: { alias: string; type: string; enabled?: boolean }[];
    userFederation?: { name: string; type: string; enabled?: boolean }[];
    smtp?: Record<string, unknown>;
    events?: Record<string, unknown>;
    bootstrap?: Record<string, unknown>;
    observability?: Record<string, unknown>;
  };
  status?: unknown;
}
export interface RealmRow {
  id: string;
  [key: string]: unknown;
}
export interface IdentityStore {
  get<T>(tenant: string, collection: string, id: string): Promise<T | undefined>;
  put<T extends { id: string }>(tenant: string, collection: string, row: T): Promise<void>;
  delete(tenant: string, collection: string, id: string): Promise<boolean>;
  list<T>(tenant: string, collection: string): Promise<T[]>;
  transaction<T>(tenant: string, fn: (tx: IdentityStore) => Promise<T>): Promise<T>;
}
export interface RealmPasswordHasher {
  algorithm: 'argon2id';
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}
export interface RealmKeyPair {
  privateKey: KeyObject;
  publicKey: KeyObject;
  kid?: string;
}
export interface IdentityDependencies {
  store?: IdentityStore;
  passwordHasher?: RealmPasswordHasher;
  signingKey?: RealmKeyPair;
  resolveSecret?: (ref: string) => Promise<string>;
  sendAction?: (event: {
    type: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'INVITE';
    userId: string;
    email: string;
    token: string;
    realm: string;
  }) => Promise<void>;
  breachedPassword?: (password: string) => Promise<boolean>;
  authenticateBrowser?: (req: IncomingMessage) => Promise<string | undefined>;
  now?: () => number;
  onEvent?: (type: string, fields: Record<string, unknown>) => void | Promise<void>;
}
export interface RealmUser {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  roles: string[];
  groups: string[];
  enabled: boolean;
  createdAt: number;
  [key: string]: unknown;
}
export interface TokenSet {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}
export interface AuthPrincipal {
  sub: string;
  tenantId: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  roles: string[];
  groups: string[];
  orgs?: string[];
  scope: string;
  aud: string | string[];
  iss: string;
  exp: number;
  iat: number;
  client_id: string;
  token_use: 'access' | 'id';
  [key: string]: unknown;
}
