import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { TenantSecretCipher as EnvelopeCrypto } from './saas-foundation.js';
import { matchTotp, newTotpSecret } from './totp.js';
import type {
  SaasActorContext as ActorContext,
  SaasStore as Store,
  SaasJsonRecord as JsonRecord,
} from './saas-foundation.js';
import { atomic, fail, hash, now, text, strings } from './saas-foundation.js';
import type { Row } from './saas-foundation.js';
const derive = (password: string, salt: string) =>
  new Promise<string>((resolve, reject) =>
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key.toString('hex')))),
  );
const token = () => randomBytes(32).toString('base64url') as string;
const email = (v: unknown) => {
  const s = text(v, 'email', 254).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return fail('Invalid email');
  return s;
};
function password(v: unknown) {
  const p = text(v, 'password', 1024);
  if (p.length < 12) return fail('Password must contain at least 12 characters');
  return p;
}
export interface AccountPasswordPolicy {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireDigit?: boolean;
  requireSymbol?: boolean;
  breached?: (password: string) => Promise<boolean> | boolean;
}
interface User {
  id: string;
  email: string;
  salt: string;
  digest: string;
  verified: boolean;
  failed: number;
  lockedUntil: number;
  roles: string[];
  createdAt: string;
  disabled?: boolean;
}
interface Session {
  id: string;
  userId: string;
  expires: number;
  revoked: boolean;
  mfa?: boolean;
  issuedAt?: number;
}
interface Challenge {
  id: string;
  userId: string;
  purpose: string;
  expires: number;
  attempts?: number;
}
const safe = ({ salt: _s, digest: _d, ...user }: User) => user;
/** Trusted backend only. Deliver challenge secrets out of band; do not return them to browser callers. */
export class Accounts {
  constructor(
    private store: Store,
    private encryptionKey?: Uint8Array,
    private passwordPolicy: AccountPasswordPolicy = {},
  ) {
    const n = passwordPolicy.minLength ?? 12;
    if (!Number.isSafeInteger(n) || n < 12 || n > 1024)
      throw Error('Invalid password policy length');
  }
  private async validatePassword(input: unknown) {
    const p = password(input),
      policy = this.passwordPolicy;
    if (
      p.length < (policy.minLength ?? 12) ||
      (policy.requireUppercase && !/[A-Z]/.test(p)) ||
      (policy.requireLowercase && !/[a-z]/.test(p)) ||
      (policy.requireDigit && !/\d/.test(p)) ||
      (policy.requireSymbol && !/[^A-Za-z0-9]/.test(p))
    )
      return fail('Password does not meet policy', 'PASSWORD_POLICY', 400);
    if (policy.breached && (await policy.breached(p)))
      return fail('Password does not meet policy', 'PASSWORD_POLICY', 400);
    return p;
  }

  private crypto() {
    if (!this.encryptionKey) return fail('MFA encryption key required', 'CONFIG_REQUIRED', 503);
    return new EnvelopeCrypto(this.encryptionKey);
  }
  private async factor(tx: Store, tenant: string, userId: string) {
    return tx.get<{
      id: string;
      secret: JsonRecord;
      enabled: boolean;
      lastStep: number;
      expires?: number;
      attempts?: number;
      failedUntil?: number;
    }>(tenant, 'mfa-factors', userId);
  }
  private async revokeSessions(tx: Store, tenant: string, userId: string) {
    for (const s of await tx.list<Session>(tenant, 'sessions'))
      if (s.userId === userId) await tx.delete(tenant, 'sessions', s.id);
  }
  private async issueAfterPrimary(tx: Store, tenant: string, userId: string) {
    const factor = await this.factor(tx, tenant, userId);
    if (!factor?.enabled) return this.session(tx, tenant, userId);
    const secret = token();
    await tx.put<Challenge>(tenant, 'account-challenges', {
      id: hash(secret),
      userId,
      purpose: 'mfa',
      expires: Date.now() + 300000,
      attempts: 0,
    });
    return { mfaRequired: true, challenge: secret, expiresIn: 300 };
  }
  async register(tenant: string, input: { email: unknown; password: unknown }) {
    const address = email(input.email);
    const salt = token(),
      digest = await derive(await this.validatePassword(input.password), salt);
    return atomic(this.store, tenant, async (tx) => {
      const id = hash(address);
      if (await tx.get(tenant, 'users', id)) return fail('Account exists', 'CONFLICT', 409);
      const user: User = {
        id,
        email: address,
        salt,
        digest,
        verified: false,
        failed: 0,
        lockedUntil: 0,
        roles: [],
        createdAt: now(),
      };
      await tx.put(tenant, 'users', user);
      return safe(user);
    });
  }
  private async session(tx: Store, tenant: string, userId: string, mfa = false) {
    const secret = token();
    await tx.put<Session>(tenant, 'sessions', {
      id: hash(secret),
      userId,
      expires: Date.now() + 86400000,
      revoked: false,
      mfa,
      issuedAt: Date.now(),
    });
    return { token: secret, expiresIn: 86400 };
  }
  async login(tenant: string, input: { email: unknown; password: unknown }) {
    const id = hash(email(input.email)),
      p = text(input.password, 'password', 1024);
    const result = await atomic(this.store, tenant, async (tx) => {
      const u = await tx.get<User>(tenant, 'users', id);
      const attempt = await derive(p, u?.salt ?? 'dummy-salt-for-unknown-user');
      if (!u || u.disabled || u.lockedUntil > Date.now()) return undefined;
      if (!timingSafeEqual(Buffer.from(attempt, 'hex'), Buffer.from(u.digest, 'hex'))) {
        const failed = u.failed + 1;
        await tx.put(tenant, 'users', {
          ...u,
          failed,
          lockedUntil: failed >= 5 ? Date.now() + 900000 : 0,
        });
        return undefined;
      }
      if (!u.verified) return undefined;
      await tx.put(tenant, 'users', { ...u, failed: 0, lockedUntil: 0 });
      return this.issueAfterPrimary(tx, tenant, u.id);
    });
    return result ?? fail('Invalid credentials', 'UNAUTHENTICATED', 401);
  }
  async challenge(tenant: string, address: unknown, purpose: 'verify' | 'reset' | 'passwordless') {
    const user = await this.store.get<User>(tenant, 'users', hash(email(address)));
    if (!user || user.disabled) return undefined;
    const secret = token();
    await this.store.put<Challenge>(tenant, 'account-challenges', {
      id: hash(secret),
      userId: user.id,
      purpose,
      expires: Date.now() + 600000,
    });
    return { secret, email: user.email, expiresIn: 600 };
  }
  async consume(
    tenant: string,
    secret: unknown,
    purpose: 'verify' | 'reset' | 'passwordless',
    newPassword?: unknown,
  ) {
    return atomic(this.store, tenant, async (tx) => {
      const id = hash(text(secret, 'challenge', 200));
      const ch = await tx.get<Challenge>(tenant, 'account-challenges', id);
      if (!ch || ch.purpose !== purpose || ch.expires < Date.now())
        return fail('Invalid or expired challenge', 'UNAUTHENTICATED', 401);
      const user = await tx.get<User>(tenant, 'users', ch.userId);
      if (!user || user.disabled) return fail('Invalid challenge', 'UNAUTHENTICATED', 401);
      await tx.delete(tenant, 'account-challenges', id);
      if (purpose === 'passwordless') {
        if (!user.verified) return fail('Email not verified', 'UNAUTHENTICATED', 401);
        return this.issueAfterPrimary(tx, tenant, user.id);
      }
      if (purpose === 'reset') {
        const salt = token();
        await tx.put(tenant, 'users', {
          ...user,
          salt,
          digest: await derive(await this.validatePassword(newPassword), salt),
          failed: 0,
          lockedUntil: 0,
        });
        await this.revokeSessions(tx, tenant, user.id);
        for (const other of await tx.list<Challenge>(tenant, 'account-challenges'))
          if (other.userId === user.id) await tx.delete(tenant, 'account-challenges', other.id);
      } else await tx.put(tenant, 'users', { ...user, verified: true });
      return { ok: true };
    });
  }
  async verify(tenant: string, secret: string): Promise<ActorContext | undefined> {
    const s = await this.store.get<Session>(tenant, 'sessions', hash(secret));
    if (!s || s.revoked || s.expires < Date.now()) return;
    const u = await this.store.get<User>(tenant, 'users', s.userId);
    if (!u || u.disabled || !u.verified) return;
    if ((await this.factor(this.store, tenant, u.id))?.enabled && !s.mfa) return;
    return { tenantId: tenant, actorId: u.id, roles: u.roles };
  }
  async enrollMfa(ctx: ActorContext, input: { password: unknown }) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const u = await tx.get<User>(ctx.tenantId, 'users', ctx.actorId);
      if (
        !u?.verified ||
        u.disabled ||
        !timingSafeEqual(
          Buffer.from(await derive(text(input.password, 'password', 1024), u.salt), 'hex'),
          Buffer.from(u.digest, 'hex'),
        )
      )
        return fail('Invalid credentials', 'UNAUTHENTICATED', 401);
      if ((await this.factor(tx, ctx.tenantId, u.id))?.enabled)
        return fail('MFA already enrolled', 'CONFLICT', 409);
      const secret = newTotpSecret();
      await tx.put(ctx.tenantId, 'mfa-factors', {
        id: u.id,
        secret: this.crypto().encrypt(ctx, secret),
        enabled: false,
        lastStep: -1,
        expires: Date.now() + 600000,
        attempts: 0,
      });
      return {
        secret,
        uri: `otpauth://totp/${encodeURIComponent('Sapling:' + u.email)}?secret=${secret}&issuer=Sapling&algorithm=SHA1&digits=6&period=30`,
      };
    });
  }
  async confirmMfa(ctx: ActorContext, code: unknown) {
    const ok = await atomic(this.store, ctx.tenantId, async (tx) => {
      const f = await this.factor(tx, ctx.tenantId, ctx.actorId);
      if (!f || f.enabled || Number(f.expires) < Date.now() || Number(f.attempts ?? 0) >= 5)
        return false;
      const step = matchTotp(this.crypto().decrypt(ctx, f.secret), code, f.lastStep);
      if (step === undefined) {
        await tx.put(ctx.tenantId, 'mfa-factors', { ...f, attempts: Number(f.attempts ?? 0) + 1 });
        return false;
      }
      await tx.put(ctx.tenantId, 'mfa-factors', {
        ...f,
        enabled: true,
        lastStep: step,
        expires: undefined,
      });
      await this.revokeSessions(tx, ctx.tenantId, ctx.actorId);
      return true;
    });
    if (!ok) return fail('Invalid MFA confirmation', 'UNAUTHENTICATED', 401);
    return { enabled: true, reauthenticate: true };
  }
  async verifyMfa(tenant: string, challenge: unknown, code: unknown) {
    const result = await atomic(this.store, tenant, async (tx) => {
      const id = hash(text(challenge, 'challenge', 200)),
        ch = await tx.get<Challenge>(tenant, 'account-challenges', id);
      if (!ch || ch.purpose !== 'mfa' || ch.expires < Date.now() || Number(ch.attempts ?? 0) >= 5)
        return undefined;
      const u = await tx.get<User>(tenant, 'users', ch.userId),
        f = await this.factor(tx, tenant, ch.userId);
      if (!u?.verified || u.disabled || !f?.enabled || Number(f.failedUntil ?? 0) > Date.now())
        return undefined;
      const step = matchTotp(
        this.crypto().decrypt({ tenantId: tenant, actorId: u.id }, f.secret),
        code,
        f.lastStep,
      );
      if (step === undefined) {
        const attempts = Number(f.attempts ?? 0) + 1;
        await tx.put(tenant, 'mfa-factors', {
          ...f,
          attempts: attempts >= 5 ? 0 : attempts,
          failedUntil: attempts >= 5 ? Date.now() + 300000 : 0,
        });
        await tx.put(tenant, 'account-challenges', {
          ...ch,
          attempts: Number(ch.attempts ?? 0) + 1,
        });
        return undefined;
      }
      await tx.put(tenant, 'mfa-factors', { ...f, lastStep: step, attempts: 0, failedUntil: 0 });
      await tx.delete(tenant, 'account-challenges', id);
      return this.session(tx, tenant, u.id, true);
    });
    return result ?? fail('Invalid MFA challenge', 'UNAUTHENTICATED', 401);
  }
  async revokeMfa(ctx: ActorContext, input: { token: unknown; code: unknown }) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const session = await tx.get<Session>(ctx.tenantId, 'sessions', hash(text(input.token)));
      const f = await this.factor(tx, ctx.tenantId, ctx.actorId);
      if (
        !session?.mfa ||
        session.userId !== ctx.actorId ||
        session.revoked ||
        session.expires < Date.now() ||
        Date.now() - Number(session.issuedAt) > 300000 ||
        !f?.enabled
      )
        return fail('Recent MFA session required', 'FORBIDDEN', 403);
      const step = matchTotp(this.crypto().decrypt(ctx, f.secret), input.code, f.lastStep);
      if (step === undefined) return fail('Invalid code', 'UNAUTHENTICATED', 401);
      await tx.delete(ctx.tenantId, 'mfa-factors', ctx.actorId);
      await this.revokeSessions(tx, ctx.tenantId, ctx.actorId);
      return { enabled: false };
    });
  }
  async requestChallenge(
    tenant: string,
    address: unknown,
    purpose: 'verify' | 'reset' | 'passwordless',
    deliver: (message: { email: string; secret: string; purpose: string }) => Promise<void>,
  ) {
    const normalized = email(address),
      id = hash(normalized + ':' + purpose);
    const permitted = await atomic(this.store, tenant, async (tx) => {
      const old = await tx.get<{ id: string; until: number }>(tenant, 'challenge-rate', id);
      if (old && old.until > Date.now()) return false;
      await tx.put(tenant, 'challenge-rate', { id, until: Date.now() + 60000 });
      return true;
    });
    if (permitted) {
      const ch = await this.challenge(tenant, normalized, purpose);
      if (ch) await deliver({ ...ch, purpose });
    }
    return { accepted: true };
  }
  async verifyRecentMfa(ctx: ActorContext, secret: unknown) {
    const session = await this.store.get<Session>(ctx.tenantId, 'sessions', hash(text(secret)));
    return !!(
      session?.mfa &&
      session.userId === ctx.actorId &&
      !session.revoked &&
      session.expires > Date.now() &&
      Date.now() - Number(session.issuedAt) < 300000 &&
      (await this.verify(ctx.tenantId, text(secret)))
    );
  }
  async activeUser(tenant: string, id: string) {
    const user = await this.store.get<User>(tenant, 'users', id);
    return !!(user?.verified && !user.disabled);
  }
  async cleanup(tenant: string, limit = 500) {
    return atomic(this.store, tenant, async (tx) => {
      let deleted = 0;
      for (const collection of ['sessions', 'account-challenges', 'invitations', 'oidc-states']) {
        for (const row of await tx.list<{ id: string; expires: number }>(tenant, collection)) {
          if (deleted >= limit) return { deleted };
          if (row.expires < Date.now()) {
            await tx.delete(tenant, collection, row.id);
            deleted++;
          }
        }
      }
      return { deleted };
    });
  }
  async logout(ctx: ActorContext, secret: string) {
    const id = hash(secret);
    const s = await this.store.get<Session>(ctx.tenantId, 'sessions', id);
    if (s?.userId === ctx.actorId) await this.store.delete(ctx.tenantId, 'sessions', id);
    return { ok: true };
  }
  async sessions(ctx: ActorContext) {
    return (await this.store.list<Session>(ctx.tenantId, 'sessions'))
      .filter((s) => s.userId === ctx.actorId)
      .map(({ id: _id, ...s }) => s);
  }
  async roles(ctx: ActorContext, userId: string, roles: unknown) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const u = await tx.get<User>(ctx.tenantId, 'users', userId);
      if (!u) return fail('Unknown user', 'NOT_FOUND', 404);
      const next = { ...u, roles: strings(roles) };
      await tx.put(ctx.tenantId, 'users', next);
      return safe(next);
    });
  }
  async directory(ctx: ActorContext) {
    return (await this.store.list<User>(ctx.tenantId, 'users')).slice(0, 500).map(safe);
  }
  async invite(ctx: ActorContext, address: unknown, roles: unknown) {
    const secret = token();
    await this.store.put(ctx.tenantId, 'invitations', {
      id: hash(secret),
      email: email(address),
      roles: strings(roles),
      expires: Date.now() + 86400000,
      invitedBy: ctx.actorId,
    });
    return { secret, expiresIn: 86400 };
  }
  async acceptInvite(ctx: ActorContext, secret: unknown) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const id = hash(text(secret, 'invitation', 200));
      const inv = await tx.get<Row>(ctx.tenantId, 'invitations', id),
        u = await tx.get<User>(ctx.tenantId, 'users', ctx.actorId);
      if (!inv || !u?.verified || u.email !== inv.email || Number(inv.expires) < Date.now())
        return fail('Invalid invitation', 'FORBIDDEN', 403);
      await tx.put(ctx.tenantId, 'users', {
        ...u,
        roles: [...new Set([...u.roles, ...strings(inv.roles)])],
      });
      await tx.delete(ctx.tenantId, 'invitations', id);
      return { ok: true };
    });
  }
}
