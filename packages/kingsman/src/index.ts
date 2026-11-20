import {
  createHmac,
  createHash,
  randomBytes,
  randomUUID,
  generateKeyPairSync,
  createSign,
  createVerify,
  timingSafeEqual,
  type KeyObject,
} from 'node:crypto';
import {
  IdentityError,
  validateRealmConfig,
  loadRealmConfig,
  period,
  clientById,
} from './config.js';
import { MemoryIdentityStore } from './store.js';
import type {
  RealmConfig,
  RealmClient,
  IdentityStore,
  IdentityDependencies,
  RealmPasswordHasher,
  RealmUser,
  TokenSet,
  AuthPrincipal,
} from './types.js';
export type * from './types.js';
export { IdentityError, validateRealmConfig, loadRealmConfig, MemoryIdentityStore };
const digest = (v: string) => createHash('sha256').update(v).digest('hex');
const opaque = () => randomBytes(32).toString('base64url');
const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(digest(a), 'hex'),
    y = Buffer.from(digest(b), 'hex');
  return timingSafeEqual(x, y);
};
const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
const parse = (v: string) =>
  JSON.parse(Buffer.from(v, 'base64url').toString('utf8')) as Record<string, unknown>;
const asStr = (v: unknown, label: string, max = 200) => {
  if (typeof v !== 'string' || !v.trim() || v.length > max)
    throw new IdentityError('INVALID_INPUT', `Invalid ${label}`);
  return v;
};
interface Session {
  id: string;
  userId: string;
  clientId?: string;
  createdAt: number;
  idleUntil: number;
  expiresAt: number;
  idleMs?: number;
  revoked?: boolean;
}
interface Credential {
  id: string;
  hash: string;
  history: string[];
  changedAt: number;
}
interface Action {
  id: string;
  userId: string;
  purpose: string;
  expiresAt: number;
}
interface AuthCode {
  id: string;
  userId: string;
  sessionId: string;
  clientId: string;
  redirectUri: string;
  challenge: string;
  scope: string;
  nonce?: string;
  expiresAt: number;
}
interface Refresh {
  id: string;
  family: string;
  userId: string;
  sessionId?: string;
  clientId: string;
  scope: string;
  expiresAt: number;
  familyExpiresAt?: number;
  used?: boolean;
}
interface Org {
  id: string;
  name: string;
  ownerId: string;
  domains: string[];
  members: Record<string, string>;
  createdAt: number;
}
export class IdentityPlatform {
  readonly config: RealmConfig;
  readonly store: IdentityStore;
  private now: () => number;
  private signer: { privateKey: KeyObject; publicKey: KeyObject; kid: string };
  private readonly hasher?: RealmPasswordHasher;
  constructor(
    config: RealmConfig,
    readonly deps: IdentityDependencies = {},
  ) {
    this.config = validateRealmConfig(config);
    this.store = deps.store ?? new MemoryIdentityStore();
    this.now = deps.now ?? Date.now;
    this.hasher = deps.passwordHasher;
    if (deps.passwordHasher && deps.passwordHasher.algorithm !== 'argon2id')
      throw new IdentityError('INSECURE_HASHER', 'Argon2id credential adapter required');
    if (
      config.metadata.environment === 'production' &&
      (!deps.store ||
        deps.store instanceof MemoryIdentityStore ||
        !deps.signingKey ||
        !deps.passwordHasher)
    )
      throw new IdentityError(
        'INSECURE_CONFIG',
        'Production requires persistent store, stable signing key and Argon2id hasher',
      );
    if (!deps.signingKey && config.metadata.environment === 'production')
      throw new IdentityError('SIGNER_REQUIRED', 'Production key provider required');
    if (
      config.metadata.environment === 'production' &&
      config.spec.identityProviders?.some((x) => x.enabled)
    )
      throw new IdentityError(
        'FEDERATION_REQUIRED',
        'Configured identity provider is not implemented; disable it or integrate an approved broker before production',
        503,
      );
    const keys = deps.signingKey ?? generateKeyPairSync('rsa', { modulusLength: 2048 });
    if (
      keys.publicKey.asymmetricKeyType !== 'rsa' ||
      keys.privateKey.asymmetricKeyType !== 'rsa' ||
      (keys.publicKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
    )
      throw new IdentityError('INSECURE_KEY', 'RSA 2048+ required');
    const kid =
      deps.signingKey?.kid ??
      digest(keys.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')).slice(
        0,
        24,
      );
    this.signer = { ...keys, kid };
  }
  get realm() {
    return this.config.metadata.name;
  }
  get issuer() {
    return this.config.spec.frontend.issuer;
  }
  get capabilities() {
    return {
      supported: [
        'realm-config',
        'users',
        'local-password',
        'hashed-actions',
        'session-revocation',
        'RS256-JWT',
        'JWKS',
        'authorization-code-PKCE-S256',
        'client-credentials-client-secret',
        'refresh-rotation-replay-protection',
        'groups',
        'realm-roles',
        'organization-membership',
        'organization-invitation',
        'TOTP-SHA256',
      ],
      integrationRequired: [
        'argon2id-hasher',
        'breached-password-check',
        'email-delivery',
        'persistent-session-store',
        'stable-KMS-signing-key',
        'key-rotation',
        'external-IdP',
        'google',
        'SAML',
        'LDAP',
        'WebAuthn',
        'private-key-jwt',
        'DPoP',
        'theme-rendering',
        'SMTP',
        'SIEM',
      ],
    };
  }
  private checkActive() {
    if (this.config.spec.state && this.config.spec.state !== 'active')
      throw new IdentityError('REALM_DISABLED', 'Realm is disabled', 403);
  }
  private async emit(type: string, fields: Record<string, unknown>) {
    await this.deps.onEvent?.(type, { realm: this.realm, ...fields });
  }
  private async hashPassword(password: string, user: string, email: string) {
    if (!this.hasher)
      throw new IdentityError('HASHER_REQUIRED', 'Argon2id implementation not configured', 503);
    const p = this.config.spec.security.passwordPolicy;
    const length = [...password].length;
    if (
      length < p.minLength ||
      length > (p.maxLength ?? 128) ||
      (p.notUsername && password.toLowerCase().includes(user.toLowerCase())) ||
      (p.notEmail && password.toLowerCase().includes(email.split('@')[0].toLowerCase()))
    )
      throw new IdentityError('PASSWORD_POLICY', 'Password does not meet policy', 422);
    for (const [name, regex] of [
      ['digits', /\d/g],
      ['uppercase', /[A-Z]/g],
      ['lowercase', /[a-z]/g],
      ['symbols', /[^\p{L}\p{N}\s]/gu],
    ] as const)
      if ((password.match(regex)?.length ?? 0) < (p.require?.[name] ?? 0))
        throw new IdentityError('PASSWORD_POLICY', 'Password does not meet policy', 422);
    if (p.breachedPasswordCheck) {
      if (!this.deps.breachedPassword)
        throw new IdentityError(
          'BREACH_CHECK_REQUIRED',
          'Breached-password checker unavailable',
          503,
        );
      if (await this.deps.breachedPassword(password))
        throw new IdentityError('PASSWORD_POLICY', 'Password is not allowed', 422);
    }
    return this.hasher.hash(password);
  }
  private findUser = async (login: string) => {
    const id = await this.store.get<{ id: string; userId: string }>(
      this.realm,
      'user-index',
      digest(login.toLowerCase()),
    );
    return id ? this.store.get<RealmUser>(this.realm, 'users', id.userId) : undefined;
  };
  async registerUser(input: {
    username: string;
    email: string;
    password: string;
    attributes?: Record<string, unknown>;
  }) {
    this.checkActive();
    const r = this.config.spec.registration;
    if (!r?.enabled)
      throw new IdentityError('REGISTRATION_DISABLED', 'Registration is disabled', 403);
    const username = asStr(input.username, 'username', 150).trim().toLowerCase(),
      email = asStr(input.email, 'email', 320).trim().toLowerCase();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      (r.allowedEmailDomains?.length && !r.allowedEmailDomains.includes(email.split('@')[1]))
    )
      throw new IdentityError('INVALID_EMAIL', 'Email domain not allowed', 422);
    if (r.verifyEmail && !this.deps.sendAction)
      throw new IdentityError(
        'DELIVERY_REQUIRED',
        'Email verification delivery not configured',
        503,
      );
    const encrypted = await this.hashPassword(input.password, username, email),
      id = randomUUID(),
      groups = [...(this.config.spec.defaultGroups ?? [])],
      roles = [...(this.config.spec.roles?.defaultRoles ?? [])];
    const attributes = input.attributes ?? {};
    const rules = this.config.spec.userProfile?.attributes ?? [];
    for (const [key, v] of Object.entries(attributes)) {
      const rule = rules.find((a) => a.name === key);
      if (
        [
          'id',
          'username',
          'email',
          'emailVerified',
          'roles',
          'groups',
          'enabled',
          'createdAt',
        ].includes(key) ||
        !rule ||
        !rule.permissions?.edit?.includes('user') ||
        typeof v !== 'string' ||
        v.length > 1000
      )
        throw new IdentityError('INVALID_PROFILE', 'Profile attribute not user-editable', 422);
      const len = (rule.validations?.length ?? {}) as { max?: number };
      if (len.max && v.length > len.max)
        throw new IdentityError('INVALID_PROFILE', 'Profile attribute exceeds limit', 422);
      const pattern = (rule.validations?.pattern ?? {}) as { regex?: string };
      if (pattern.regex && !new RegExp(pattern.regex).test(v))
        throw new IdentityError('INVALID_PROFILE', 'Profile attribute invalid', 422);
    }
    const user: RealmUser = {
      id,
      username,
      email,
      emailVerified: !r.verifyEmail,
      roles,
      groups,
      enabled: true,
      createdAt: this.now(),
      ...attributes,
    };
    await this.store.transaction(this.realm, async (tx) => {
      for (const key of [username, email])
        if (await tx.get(this.realm, 'user-index', digest(key)))
          throw new IdentityError('ACCOUNT_EXISTS', 'Account exists', 409);
      await tx.put(this.realm, 'users', user);
      await tx.put(this.realm, 'credentials', {
        id,
        hash: encrypted,
        history: [],
        changedAt: this.now(),
      });
      for (const key of [username, email])
        await tx.put(this.realm, 'user-index', { id: digest(key), userId: id });
    });
    await this.emit('REGISTER', { userId: id });
    if (r.verifyEmail) await this.issueAction(id, 'VERIFY_EMAIL', period('12h', 43200000));
    return this.publicUser(user);
  }
  private publicUser(user: RealmUser) {
    const allowed = new Set(
      (this.config.spec.userProfile?.attributes ?? [])
        .filter((a) => a.permissions?.view?.includes('user') && !a.sensitive)
        .map((a) => a.name),
    );
    return Object.fromEntries(
      Object.entries(user).filter(
        ([k]) =>
          [
            'id',
            'username',
            'email',
            'emailVerified',
            'roles',
            'groups',
            'enabled',
            'createdAt',
          ].includes(k) || allowed.has(k),
      ),
    ) as Partial<RealmUser>;
  }
  private async issueAction(
    userId: string,
    purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'INVITE',
    ttlMs: number,
  ) {
    const user = await this.store.get<RealmUser>(this.realm, 'users', userId);
    if (!user || !this.deps.sendAction)
      throw new IdentityError('DELIVERY_REQUIRED', 'Action delivery not configured', 503);
    const token = opaque(),
      id = digest(token);
    await this.store.put(this.realm, 'action-tokens', {
      id,
      userId,
      purpose,
      expiresAt: this.now() + ttlMs,
    });
    await this.deps.sendAction({
      type: purpose,
      userId,
      email: user.email,
      token,
      realm: this.realm,
    });
    return { issued: true };
  }
  async verifyEmail(token: string) {
    const id = digest(asStr(token, 'token', 200));
    const result = await this.store.transaction(this.realm, async (tx) => {
      const a = await tx.get<Action>(this.realm, 'action-tokens', id);
      if (!a || a.purpose !== 'VERIFY_EMAIL' || a.expiresAt <= this.now())
        throw new IdentityError('INVALID_TOKEN', 'Invalid or expired verification token', 401);
      const user = await tx.get<RealmUser>(this.realm, 'users', a.userId);
      if (!user || !user.enabled) throw new IdentityError('INVALID_TOKEN', 'User unavailable', 401);
      await tx.delete(this.realm, 'action-tokens', id);
      await tx.put(this.realm, 'users', { ...user, emailVerified: true });
      return user.id;
    });
    await this.emit('VERIFY_EMAIL', { userId: result });
    return { verified: true };
  }
  async requestPasswordReset(email: string) {
    const user = await this.findUser(asStr(email, 'email', 320));
    if (user && this.config.spec.registration?.resetPasswordAllowed)
      await this.issueAction(user.id, 'RESET_PASSWORD', period('15m', 900000));
    return { accepted: true };
  }
  async resetPassword(token: string, password: string) {
    const id = digest(asStr(token, 'token', 200)),
      a = await this.store.get<Action>(this.realm, 'action-tokens', id);
    if (!a || a.purpose !== 'RESET_PASSWORD' || a.expiresAt <= this.now())
      throw new IdentityError('INVALID_TOKEN', 'Invalid reset token', 401);
    const user = await this.store.get<RealmUser>(this.realm, 'users', a.userId);
    if (!user) throw new IdentityError('INVALID_TOKEN', 'Account not found', 401);
    const current = await this.store.get<Credential>(this.realm, 'credentials', user.id);
    if (current && this.hasher) {
      for (const prior of [current.hash, ...current.history])
        if (await this.hasher.verify(prior, password))
          throw new IdentityError('PASSWORD_HISTORY', 'Recent password cannot be reused', 422);
    }
    const encrypted = await this.hashPassword(password, user.username, user.email);
    await this.store.transaction(this.realm, async (tx) => {
      const tokenRow = await tx.get<Action>(this.realm, 'action-tokens', id);
      if (!tokenRow || tokenRow.expiresAt <= this.now())
        throw new IdentityError('INVALID_TOKEN', 'Reset already used', 401);
      const old = await tx.get<Credential>(this.realm, 'credentials', user.id);
      if (!old) throw new IdentityError('INVALID_CREDENTIAL', 'Credential missing', 401);
      await tx.put(this.realm, 'credentials', {
        id: user.id,
        hash: encrypted,
        history: [old.hash, ...old.history].slice(
          0,
          this.config.spec.security.passwordPolicy.history ?? 5,
        ),
        changedAt: this.now(),
      });
      await tx.delete(this.realm, 'action-tokens', id);
      for (const session of await tx.list<Session>(this.realm, 'sessions'))
        if (session.userId === user.id)
          await tx.put(this.realm, 'sessions', { ...session, revoked: true });
    });
    await this.emit('RESET_PASSWORD', { userId: user.id });
    return { reset: true };
  }
  private effectiveRoles(user: RealmUser) {
    const roles = new Set(user.roles);
    const find = (
      path: string,
      groups: NonNullable<RealmConfig['spec']['groups']>,
      prefix = '',
    ) => {
      for (const g of groups) {
        const full = prefix + '/' + g.name;
        if (path === full) for (const role of g.roles?.realm ?? []) roles.add(role);
        if (g.children?.length) find(path, g.children, full);
      }
    };
    for (const group of user.groups) find(group, this.config.spec.groups ?? []);
    const defs = this.config.spec.roles?.realm ?? [];
    for (let i = 0; i < defs.length; i++)
      for (const r of defs)
        if (roles.has(r.name)) for (const c of r.composites?.realm ?? []) roles.add(c);
    return [...roles];
  }
  private totp(secret: string, at: number) {
    const p = this.config.spec.security.otpPolicy,
      step = period(p?.period ?? '30s', 30000),
      digits = p?.digits ?? 6,
      buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(Math.floor(at / step)));
    const result = createHmac(
        p?.algorithm === 'SHA1' ? 'sha1' : 'sha256',
        Buffer.from(secret, 'base64url'),
      )
        .update(buf)
        .digest(),
      offset = result.at(-1)! & 15;
    return String((result.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).padStart(digits, '0');
  }
  private async verifyTotp(user: RealmUser, otp?: string) {
    const requiredRole = this.config.spec.authenticationFlows
      ?.flatMap((f) => f.steps)
      .find(
        (s) =>
          s.authenticator === 'otp-form' &&
          s.requirement === 'conditional' &&
          s.condition?.type === 'user-role',
      )?.condition?.role;
    if (!requiredRole || !this.effectiveRoles(user).includes(String(requiredRole))) return;
    const p = this.config.spec.security.otpPolicy,
      digits = p?.digits ?? 6,
      lookAhead = p?.lookAhead ?? 1,
      stepMs = period(p?.period ?? '30s', 30000);
    if (
      !Number.isSafeInteger(digits) ||
      digits < 6 ||
      digits > 8 ||
      !Number.isSafeInteger(lookAhead) ||
      lookAhead < 0 ||
      lookAhead > 2
    )
      throw new IdentityError('INVALID_MFA_POLICY', 'Unsupported OTP security settings', 503);
    const stored = await this.store.get<{ secret: string }>(this.realm, 'mfa-totp', user.id);
    if (!stored || typeof otp !== 'string' || !new RegExp(`^[0-9]{${digits}}$`).test(otp))
      throw new IdentityError('MFA_REQUIRED', 'Additional authentication required', 401);
    let matchedStep: number | undefined;
    for (let offset = -lookAhead; offset <= lookAhead; offset++)
      if (safeEqual(this.totp(stored.secret, this.now() + offset * stepMs), otp)) {
        matchedStep = Math.floor(this.now() / stepMs) + offset;
        break;
      }
    if (matchedStep === undefined)
      throw new IdentityError('MFA_REQUIRED', 'Additional authentication required', 401);
    const step = matchedStep;
    await this.store.transaction(this.realm, async (tx) => {
      const previous = await tx.get<{ id: string; step: number }>(
        this.realm,
        'mfa-replays',
        user.id,
      );
      if (previous && previous.step >= step)
        throw new IdentityError('MFA_REPLAY', 'One-time code was already used', 401);
      await tx.put(this.realm, 'mfa-replays', { id: user.id, step });
    });
  }
  /** Privileged enrollment requires caller to verify identity/step-up before using this API. Secret must be protected by the store. */
  async configureTotp(userId: string, secret: string) {
    if (this.config.metadata.environment === 'production')
      throw new IdentityError(
        'MFA_KEY_PROVIDER_REQUIRED',
        'Encrypted TOTP storage adapter required',
        503,
      );
    asStr(secret, 'TOTP secret');
    await this.store.put(this.realm, 'mfa-totp', { id: userId, secret });
    return { configured: true };
  }
  async authenticatePassword(input: {
    login: string;
    password: string;
    otp?: string;
    rememberMe?: boolean;
  }) {
    this.checkActive();
    if (!this.hasher)
      throw new IdentityError('HASHER_REQUIRED', 'Argon2id hasher not configured', 503);
    const login = asStr(input.login, 'login').toLowerCase(),
      key = digest(login),
      now = this.now(),
      policy = this.config.spec.security.bruteForce;
    const attempt = await this.store.get<{
      id: string;
      failures: number;
      until: number;
      permanent?: boolean;
    }>(this.realm, 'login-attempts', key);
    if (attempt?.permanent || (attempt && attempt.until > now))
      throw new IdentityError('ACCOUNT_LOCKED', 'Account temporarily unavailable', 429);
    const user = await this.findUser(login),
      cred = user && (await this.store.get<Credential>(this.realm, 'credentials', user.id));
    const valid =
      !!user?.enabled && !!cred && (await this.hasher.verify(cred.hash, input.password));
    if (!valid) {
      await this.store.transaction(this.realm, async (tx) => {
        const a = await tx.get<{
            id: string;
            failures: number;
            until: number;
            permanent?: boolean;
          }>(this.realm, 'login-attempts', key),
          failures = (a?.failures ?? 0) + 1,
          wait =
            policy?.enabled && failures >= (policy.failureFactor ?? 5)
              ? Math.min(
                  period(policy.waitIncrement ?? '1m', 60000) *
                    (failures - (policy.failureFactor ?? 5) + 1),
                  period(policy.maxWait ?? '15m', 900000),
                )
              : 0;
        await tx.put(this.realm, 'login-attempts', {
          id: key,
          failures,
          until: this.now() + wait,
          permanent: !!policy?.permanentLockoutAfter && failures >= policy.permanentLockoutAfter,
        });
      });
      await this.emit('LOGIN_ERROR', { reason: 'invalid-credentials' });
      throw new IdentityError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
    }
    if (this.config.spec.registration?.verifyEmail && !user.emailVerified)
      throw new IdentityError('VERIFY_EMAIL_REQUIRED', 'Email verification required', 403);
    await this.verifyTotp(user, input.otp);
    const session = await this.openSession(user.id, input.rememberMe ?? false, key);
    await this.emit('LOGIN', { userId: user.id });
    return { sessionId: session.id, user: this.publicUser(user) };
  }
  private async openSession(userId: string, remember: boolean, attemptKey?: string) {
    const now = this.now(),
      settings =
        remember && this.config.spec.sessions.rememberMe?.enabled
          ? this.config.spec.sessions.rememberMe
          : this.config.spec.sessions.sso,
      id = opaque(),
      idleMs = period(settings.idle, 1800000),
      session: Session = {
        id: digest(id),
        userId,
        createdAt: now,
        idleMs,
        idleUntil: now + idleMs,
        expiresAt: now + period(settings.max, 36000000),
      };
    await this.store.transaction(this.realm, async (tx) => {
      if (attemptKey) {
        const attempt = await tx.get<{ until: number; permanent?: boolean }>(
          this.realm,
          'login-attempts',
          attemptKey,
        );
        if (attempt?.permanent || (attempt && attempt.until > this.now()))
          throw new IdentityError('ACCOUNT_LOCKED', 'Account temporarily unavailable', 429);
        await tx.delete(this.realm, 'login-attempts', attemptKey);
      }
      await tx.put(this.realm, 'sessions', session);
    });
    return { id };
  }
  async sessionUser(sessionToken: string) {
    return this.store.transaction(this.realm, async (tx) => {
      const session = await tx.get<Session>(this.realm, 'sessions', digest(sessionToken));
      if (
        !session ||
        session.revoked ||
        session.idleUntil <= this.now() ||
        session.expiresAt <= this.now()
      )
        throw new IdentityError('SESSION_EXPIRED', 'Session invalid', 401);
      const user = await tx.get<RealmUser>(this.realm, 'users', session.userId);
      if (!user?.enabled) throw new IdentityError('SESSION_EXPIRED', 'Session user invalid', 401);
      const idle = session.idleMs ?? period(this.config.spec.sessions.sso.idle, 1800000),
        next = { ...session, idleUntil: Math.min(session.expiresAt, this.now() + idle) };
      await tx.put(this.realm, 'sessions', next);
      return { session: next, user };
    });
  }
  async revokeSession(token: string) {
    const id = digest(token);
    await this.store.transaction(this.realm, async (tx) => {
      const session = await tx.get<Session>(this.realm, 'sessions', id);
      if (session) await tx.put(this.realm, 'sessions', { ...session, revoked: true });
    });
    return { revoked: true };
  }
  async authorizeCode(input: {
    sessionId: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    scope?: string;
    nonce?: string;
    state: string;
  }) {
    this.checkActive();
    const { user } = await this.sessionUser(input.sessionId),
      client = clientById(this.config, input.clientId);
    if (!client.grants?.authorizationCode || !client.redirectUris?.includes(input.redirectUri))
      throw new IdentityError('INVALID_CLIENT', 'Client redirect/grant rejected', 401);
    if (!/^[a-zA-Z0-9_-]{43}$/.test(input.codeChallenge) || !input.state || input.state.length < 8)
      throw new IdentityError('PKCE_REQUIRED', 'S256 PKCE and state required', 400);
    const scopes = new Set([
      ...(client.scopes?.default ?? this.config.spec.defaultClientScopes?.default ?? []),
      ...(client.scopes?.optional ?? []),
      'openid',
    ]);
    const requested = (input.scope ?? 'openid').split(' ').filter(Boolean);
    if (!requested.includes('openid') || requested.some((s) => !scopes.has(s)))
      throw new IdentityError('INVALID_SCOPE', 'Scope is not permitted', 400);
    const token = opaque(),
      row: AuthCode = {
        id: digest(token),
        userId: user.id,
        sessionId: digest(input.sessionId),
        clientId: input.clientId,
        redirectUri: input.redirectUri,
        challenge: input.codeChallenge,
        scope: requested.join(' '),
        nonce: input.nonce,
        expiresAt: this.now() + period(this.config.spec.tokens.authorizationCode?.ttl, 60000),
      };
    await this.store.put(this.realm, 'authorization-codes', row);
    return { code: token, state: input.state };
  }
  private async checkClient(client: RealmClient, secret?: string) {
    if (client.accessType === 'public') return;
    if (client.authenticator !== 'client-secret')
      throw new IdentityError(
        'CLIENT_AUTH_UNSUPPORTED',
        'Private-key-JWT/mTLS requires external authenticator',
        503,
      );
    if (!secret || !client.secret || !this.deps.resolveSecret)
      throw new IdentityError('INVALID_CLIENT', 'Client authentication required', 401);
    const expected = await this.deps.resolveSecret(client.secret);
    if (!expected || !safeEqual(expected, secret))
      throw new IdentityError('INVALID_CLIENT', 'Invalid client authentication', 401);
  }
  private jwt(payload: Record<string, unknown>) {
    const header = b64({ typ: 'JWT', alg: 'RS256', kid: this.signer.kid }),
      encoded = b64(payload),
      message = header + '.' + encoded;
    return (
      message +
      '.' +
      createSign('RSA-SHA256')
        .update(message)
        .end()
        .sign(this.signer.privateKey)
        .toString('base64url')
    );
  }
  jwks() {
    const jwk = this.signer.publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
    return { keys: [{ ...jwk, alg: 'RS256', use: 'sig', kid: this.signer.kid }] };
  }
  discovery() {
    const base = this.issuer,
      oidc = base + '/protocol/openid-connect';
    return {
      issuer: base,
      authorization_endpoint: oidc + '/auth',
      token_endpoint: oidc + '/token',
      userinfo_endpoint: oidc + '/userinfo',
      jwks_uri: oidc + '/certs',
      revocation_endpoint: oidc + '/revoke',
      introspection_endpoint: oidc + '/introspect',
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
      code_challenge_methods_supported: ['S256'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    };
  }
  private async issue(
    user: RealmUser,
    client: RealmClient,
    scope: string,
    sessionId?: string,
    nonce?: string,
    refreshFamily?: string,
    refreshFamilyExpiresAt?: number,
  ): Promise<TokenSet> {
    const orgs = (await this.store.list<Org>(this.realm, 'organizations'))
      .filter((o) => o.members[user.id])
      .slice(0, 100)
      .map((o) => ({ id: o.id, name: o.name, roles: [o.members[user.id]] }));
    const now = Math.floor(this.now() / 1000),
      ttl = Math.max(
        1,
        Math.floor(
          period(
            client.overrides?.accessToken?.ttl ?? this.config.spec.tokens.accessToken.ttl,
            300000,
          ) / 1000,
        ),
      ),
      roles = this.effectiveRoles(user),
      groups = user.groups,
      base = {
        iss: this.issuer,
        sub: user.id,
        iat: now,
        realm: this.realm,
        tenantId: this.realm,
        client_id: client.clientId,
        roles,
        groups,
        organizations: orgs,
        scope,
      },
      aud = ['school-platform', client.clientId],
      access = this.jwt({
        ...base,
        aud,
        exp: now + ttl,
        jti: randomUUID(),
        sid: sessionId,
        token_use: 'access',
      }),
      id = this.jwt({
        ...base,
        aud: client.clientId,
        exp: now + Math.floor(period(this.config.spec.tokens.idToken?.ttl, 300000) / 1000),
        email: user.email,
        email_verified: user.emailVerified,
        preferred_username: user.username,
        nonce,
        token_use: 'id',
      }),
      out: TokenSet = {
        access_token: access,
        id_token: id,
        token_type: 'Bearer',
        expires_in: ttl,
        scope,
      };
    if (client.grants?.refreshToken && sessionId) {
      const refresh = opaque(),
        family = refreshFamily ?? randomUUID();
      await this.store.put(this.realm, 'refresh-tokens', {
        id: digest(refresh),
        family,
        userId: user.id,
        sessionId,
        clientId: client.clientId,
        scope,
        expiresAt: Math.min(
          this.now() + period(this.config.spec.tokens.refreshToken.ttl, 2592000000),
          refreshFamilyExpiresAt ?? Number.MAX_SAFE_INTEGER,
        ),
        familyExpiresAt:
          refreshFamilyExpiresAt ??
          this.now() + period(this.config.spec.tokens.refreshToken.ttl, 2592000000),
      });
      out.refresh_token = refresh;
    }
    return out;
  }
  async exchangeCode(input: {
    clientId: string;
    clientSecret?: string;
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }) {
    const client = clientById(this.config, input.clientId);
    await this.checkClient(client, input.clientSecret);
    if (!client.grants?.authorizationCode || !/^[-._~a-zA-Z0-9]{43,128}$/.test(input.codeVerifier))
      throw new IdentityError('INVALID_GRANT', 'Invalid authorization grant', 401);
    const id = digest(input.code),
      result = await this.store.transaction(this.realm, async (tx) => {
        const row = await tx.get<AuthCode>(this.realm, 'authorization-codes', id);
        if (
          !row ||
          row.expiresAt <= this.now() ||
          row.clientId !== client.clientId ||
          row.redirectUri !== input.redirectUri ||
          !safeEqual(
            row.challenge,
            createHash('sha256').update(input.codeVerifier).digest('base64url'),
          )
        )
          throw new IdentityError('INVALID_GRANT', 'Invalid/expired authorization code', 401);
        const session = await tx.get<Session>(this.realm, 'sessions', row.sessionId),
          user = await tx.get<RealmUser>(this.realm, 'users', row.userId);
        if (
          !session ||
          session.revoked ||
          session.idleUntil <= this.now() ||
          session.expiresAt <= this.now() ||
          !user?.enabled
        )
          throw new IdentityError('INVALID_GRANT', 'Session expired', 401);
        await tx.delete(this.realm, 'authorization-codes', id);
        return { row, user };
      });
    return this.issue(
      result.user,
      client,
      result.row.scope,
      result.row.sessionId,
      result.row.nonce,
    );
  }
  async refresh(input: { clientId: string; clientSecret?: string; refreshToken: string }) {
    this.checkActive();
    const client = clientById(this.config, input.clientId);
    await this.checkClient(client, input.clientSecret);
    const id = digest(input.refreshToken),
      now = this.now();
    const claim = await this.store.transaction(this.realm, async (tx) => {
      const r = await tx.get<Refresh>(this.realm, 'refresh-tokens', id);
      if (!r || r.clientId !== client.clientId) return { error: true };
      const family = await tx.get<{ revoked: boolean }>(this.realm, 'refresh-families', r.family);
      if (r.used || family?.revoked) {
        await tx.put(this.realm, 'refresh-families', { id: r.family, revoked: true });
        if (r.sessionId) {
          const session = await tx.get<Session>(this.realm, 'sessions', r.sessionId);
          if (session) await tx.put(this.realm, 'sessions', { ...session, revoked: true });
        }
        return { error: true };
      }
      if (r.expiresAt <= now || (r.familyExpiresAt ?? r.expiresAt) <= now) return { error: true };
      const session = r.sessionId && (await tx.get<Session>(this.realm, 'sessions', r.sessionId));
      if (!session || session.revoked || session.idleUntil <= now || session.expiresAt <= now)
        return { error: true };
      const user = await tx.get<RealmUser>(this.realm, 'users', r.userId);
      if (!user?.enabled) return { error: true };
      await tx.put(this.realm, 'refresh-tokens', { ...r, used: true });
      return {
        user,
        scope: r.scope,
        sessionId: r.sessionId,
        family: r.family,
        familyExpiresAt: r.familyExpiresAt ?? r.expiresAt,
      };
    });
    if ('error' in claim)
      throw new IdentityError('INVALID_GRANT', 'Refresh denied or token family revoked', 401);
    return this.issue(
      claim.user!,
      client,
      claim.scope!,
      claim.sessionId,
      undefined,
      claim.family,
      claim.familyExpiresAt,
    );
  }
  async clientCredentials(input: { clientId: string; clientSecret: string; scope?: string }) {
    this.checkActive();
    const c = clientById(this.config, input.clientId);
    if (!c.grants?.clientCredentials || c.accessType !== 'confidential')
      throw new IdentityError('UNAUTHORIZED_CLIENT', 'Client credentials disabled', 403);
    await this.checkClient(c, input.clientSecret);
    const requested = (input.scope ?? 'openid').split(/\s+/).filter(Boolean);
    if (
      !requested.length ||
      requested.length > 20 ||
      requested.some(
        (x) => !['openid', ...(c.scopes?.default ?? []), ...(c.scopes?.optional ?? [])].includes(x),
      )
    )
      throw new IdentityError('INVALID_SCOPE', 'Client scope not allowed', 400);
    const user: RealmUser = {
      id: 'service:' + c.clientId,
      username: c.clientId,
      email: '',
      emailVerified: true,
      groups: [],
      roles: (c.serviceAccount?.roles as { realm?: string[] } | undefined)?.realm ?? [],
      enabled: true,
      createdAt: this.now(),
    };
    const token = await this.issue(
      user,
      { ...c, grants: { clientCredentials: true } },
      requested.join(' '),
    );
    delete token.id_token;
    return token;
  }
  async verifyAccessToken(
    token: string,
    options: { audiences?: string[]; clockSkewMs?: number } = {},
  ) {
    this.checkActive();
    const [a, b, signature, ...extra] = token.split('.');
    if (!a || !b || !signature || extra.length || token.length > 16384)
      throw new IdentityError('INVALID_TOKEN', 'Invalid JWT', 401);
    let header: Record<string, unknown>, payload: AuthPrincipal;
    try {
      header = parse(a);
      payload = parse(b) as unknown as AuthPrincipal;
    } catch {
      throw new IdentityError('INVALID_TOKEN', 'Malformed JWT', 401);
    }
    if (
      header.alg !== 'RS256' ||
      header.kid !== this.signer.kid ||
      header.typ !== 'JWT' ||
      !createVerify('RSA-SHA256')
        .update(a + '.' + b)
        .end()
        .verify(this.signer.publicKey, Buffer.from(signature, 'base64url'))
    )
      throw new IdentityError('INVALID_TOKEN', 'JWT signature rejected', 401);
    const now = Math.floor(this.now() / 1000),
      skew = Math.min(Math.max(0, Math.floor((options.clockSkewMs ?? 0) / 1000)), 60);
    if (
      payload.iss !== this.issuer ||
      payload.tenantId !== this.realm ||
      payload.token_use !== 'access' ||
      !payload.sub ||
      typeof payload.exp !== 'number' ||
      payload.exp <= now - skew ||
      typeof payload.iat !== 'number' ||
      payload.iat > now + skew
    )
      throw new IdentityError('INVALID_TOKEN', 'JWT claim rejected', 401);
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (options.audiences?.length && !options.audiences.some((x) => aud.includes(x)))
      throw new IdentityError('INVALID_AUDIENCE', 'Invalid JWT audience', 401);
    if (await this.store.get<{ id: string }>(this.realm, 'access-revocations', digest(token)))
      throw new IdentityError('TOKEN_REVOKED', 'Access token revoked', 401);
    if (
      !this.config.spec.clients.some((c) => c.clientId === payload.client_id && c.enabled !== false)
    )
      throw new IdentityError('INVALID_CLIENT', 'Token client is disabled', 401);
    if (payload.sid) {
      const s = await this.store.get<Session>(this.realm, 'sessions', String(payload.sid));
      if (
        !s ||
        s.revoked ||
        s.userId !== payload.sub ||
        s.idleUntil <= this.now() ||
        s.expiresAt <= this.now()
      )
        throw new IdentityError('SESSION_EXPIRED', 'Access session revoked', 401);
      const user = await this.store.get<RealmUser>(this.realm, 'users', s.userId);
      if (!user?.enabled) throw new IdentityError('SESSION_EXPIRED', 'Account disabled', 401);
    }
    return payload;
  }
  async createOrganization(ownerSession: string, name: string) {
    const { user } = await this.sessionUser(ownerSession);
    if (!this.config.spec.organizations?.enabled)
      throw new IdentityError('ORGANIZATIONS_DISABLED', 'Organizations disabled', 403);
    const id = randomUUID(),
      row: Org = {
        id,
        name: asStr(name, 'organization name', 100),
        ownerId: user.id,
        domains: [],
        members: { [user.id]: 'org-owner' },
        createdAt: this.now(),
      };
    await this.store.put(this.realm, 'organizations', row);
    return { id, name: row.name };
  }
  async inviteOrganization(ownerSession: string, orgId: string, email: string) {
    const { user } = await this.sessionUser(ownerSession),
      org = await this.store.get<Org>(this.realm, 'organizations', orgId);
    if (!org || !['org-owner', 'org-admin'].includes(org.members[user.id]))
      throw new IdentityError('FORBIDDEN', 'Cannot invite to organization', 403);
    if (!this.config.spec.organizations?.invitations?.enabled)
      throw new IdentityError('FORBIDDEN', 'Invitations disabled', 403);
    const code = opaque();
    await this.store.put(this.realm, 'org-invitations', {
      id: digest(code),
      orgId,
      email: email.toLowerCase(),
      expiresAt: this.now() + period(this.config.spec.organizations.invitations.ttl, 259200000),
    });
    return { token: code };
  }
  async acceptInvitation(session: string, code: string) {
    const { user } = await this.sessionUser(session),
      id = digest(code);
    return this.store.transaction(this.realm, async (tx) => {
      const invite = await tx.get<{ id: string; orgId: string; email: string; expiresAt: number }>(
        this.realm,
        'org-invitations',
        id,
      );
      if (!invite || invite.expiresAt <= this.now() || invite.email !== user.email)
        throw new IdentityError('INVALID_INVITE', 'Invitation invalid', 401);
      const org = await tx.get<Org>(this.realm, 'organizations', invite.orgId);
      if (!org) throw new IdentityError('INVALID_INVITE', 'Organization unavailable', 401);
      const updated: Org = {
        ...org,
        members: {
          ...org.members,
          [user.id]: this.config.spec.organizations?.defaultRole ?? 'org-member',
        },
      };
      await tx.put(this.realm, 'organizations', updated);
      await tx.delete(this.realm, 'org-invitations', id);
      return { organizationId: org.id, role: updated.members[user.id] };
    });
  }

  /** RFC 7009 style revocation. Confidential clients are authenticated before reading any token state. */
  async revokeToken(input: { clientId: string; clientSecret?: string; token: string }) {
    this.checkActive();
    const client = clientById(this.config, asStr(input.clientId, 'clientId'));
    if (client.accessType !== 'confidential')
      throw new IdentityError('CLIENT_AUTH_REQUIRED', 'Confidential client required', 401);
    await this.checkClient(client, input.clientSecret);
    const token = asStr(input.token, 'token', 16384),
      id = digest(token);
    await this.store.transaction(this.realm, async (tx) => {
      const refresh = await tx.get<Refresh>(this.realm, 'refresh-tokens', id);
      if (refresh && refresh.clientId === client.clientId) {
        await tx.put(this.realm, 'refresh-families', { id: refresh.family, revoked: true });
        return;
      }
      // JWT signing is validated before persisting revocation; no arbitrary token can exhaust storage.
      if (token.split('.').length === 3) {
        try {
          const payload = await this.verifyAccessToken(token, { audiences: [client.clientId] });
          if (payload.client_id === client.clientId)
            await tx.put(this.realm, 'access-revocations', { id, expiresAt: payload.exp * 1000 });
        } catch {
          /* RFC 7009: unknown or invalid token is still success */
        }
      }
    });
    return { revoked: true };
  }
  /** RFC 7662-like active/token claims for authenticated confidential clients only. */
  async introspectToken(input: {
    clientId: string;
    clientSecret?: string;
    token: string;
  }): Promise<Record<string, unknown>> {
    this.checkActive();
    const client = clientById(this.config, asStr(input.clientId, 'clientId'));
    if (client.accessType !== 'confidential')
      throw new IdentityError('CLIENT_AUTH_REQUIRED', 'Confidential client required', 401);
    await this.checkClient(client, input.clientSecret);
    const token = asStr(input.token, 'token', 16384),
      row = await this.store.get<Refresh>(this.realm, 'refresh-tokens', digest(token));
    if (row) {
      const family = await this.store.get<{ revoked: boolean }>(
        this.realm,
        'refresh-families',
        row.family,
      );
      const session = row.sessionId
        ? await this.store.get<Session>(this.realm, 'sessions', row.sessionId)
        : undefined;
      return row.clientId === client.clientId &&
        !row.used &&
        !family?.revoked &&
        row.expiresAt > this.now() &&
        session &&
        !session.revoked &&
        session.idleUntil > this.now() &&
        session.expiresAt > this.now()
        ? {
            active: true,
            client_id: row.clientId,
            sub: row.userId,
            scope: row.scope,
            exp: Math.floor(row.expiresAt / 1000),
            token_type: 'refresh_token',
          }
        : { active: false };
    }
    try {
      const payload = await this.verifyAccessToken(token, { audiences: [client.clientId] });
      return payload.client_id === client.clientId
        ? {
            active: true,
            client_id: payload.client_id,
            sub: payload.sub,
            scope: payload.scope,
            exp: payload.exp,
            iss: payload.iss,
            aud: payload.aud,
            token_type: 'access_token',
          }
        : { active: false };
    } catch {
      return { active: false };
    }
  }
}
export { createIdentityHttpHandler } from './http.js';

/** Canonical SaaS IAM authority. SDK compatibility files only re-export these classes. */
export { AccessService } from './saas-access.js';
export type { Role, AbacRule } from './saas-access.js';
export { IdentityService } from './saas-api-keys.js';
export type { StoredApiKey } from './saas-api-keys.js';
export { Accounts } from './saas-accounts.js';
export type { AccountPasswordPolicy } from './saas-accounts.js';
export * from './totp.js';
export { SaasIdentityError } from './saas-foundation.js';
export type { SaasActorContext, SaasStore, SaasAuditPort } from './saas-foundation.js';
export { ImpersonationService } from './saas-impersonation.js';
export { KingsmanMembership } from './saas-membership.js';
