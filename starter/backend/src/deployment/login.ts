import { createHash, randomBytes } from 'node:crypto';
import { IdentityError, type IdentityPlatform } from '@saplings/kingsman';
import { tenant } from '../config/sapling.js';
import { RequestError, type ServiceLogin } from '../services/auth.js';
export const operatorClient = 'starter-console';
export const operatorRedirect = (origin: URL) => new URL('/login', origin).href;
export const starterRoles = ['member', 'author', 'reviewer'] as const;

const rolePermissions: Readonly<Record<string, readonly string[]>> = {
  member: ['starter:jobs'],
  author: [
    'starter:jobs',
    'config:read',
    'config:edit',
    'config:public',
    'miner:read',
    'miner:admin',
    'miner:privacy',
  ],
  reviewer: ['starter:jobs', 'config:read', 'config:review', 'config:public', 'miner:read'],
};

function principal(userId: string, roles: string[]) {
  const permissions = [
    ...new Set(
      roles.flatMap((role) => (Object.hasOwn(rolePermissions, role) ? rolePermissions[role] : [])),
    ),
  ];
  return { tenantId: tenant.id, userId, roles, permissions };
}

async function verified<T>(read: () => Promise<T>) {
  try {
    return await read();
  } catch (error) {
    if (error instanceof IdentityError && error.status === 401) return;
    throw error;
  }
}

export function durableLogin(identity: IdentityPlatform, origin: URL): ServiceLogin {
  return {
    async session(token) {
      const session = await verified(() => identity.sessionUser(token));
      if (session) return principal(session.user.id, session.user.roles);
    },
    async bearer(token) {
      const claims = await verified(() =>
        identity.verifyAccessToken(token, { audiences: [operatorClient] }),
      );
      if (
        claims?.client_id === operatorClient &&
        claims.sid &&
        claims.roles.some((role) => role === 'author' || role === 'reviewer')
      )
        return principal(claims.sub, claims.roles);
    },
    async signIn({ login, password }) {
      if (
        typeof login !== 'string' ||
        !login.trim() ||
        login.length > 200 ||
        typeof password !== 'string' ||
        !password ||
        Buffer.byteLength(password) > 512
      )
        throw new RequestError('Invalid credentials.', 401);
      const result = await verified(() => identity.authenticatePassword({ login, password }));
      if (!result) throw new RequestError('Invalid credentials.', 401);
      return result.sessionId;
    },
    async revoke(token) {
      await identity.revokeSession(token);
    },
    async operatorToken(sessionId) {
      const session = await verified(() => identity.sessionUser(sessionId));
      if (!session) throw new RequestError('Sign in to continue.', 401);
      if (!session.user.roles.some((role) => role === 'author' || role === 'reviewer'))
        throw new RequestError('Operator permission required.', 403);
      const codeVerifier = randomBytes(32).toString('base64url');
      const redirectUri = operatorRedirect(origin);
      const { code } = await identity.authorizeCode({
        clientId: operatorClient,
        sessionId,
        redirectUri,
        codeChallenge: createHash('sha256').update(codeVerifier).digest('base64url'),
        state: randomBytes(24).toString('base64url'),
      });
      const result = await identity.exchangeCode({
        clientId: operatorClient,
        code,
        codeVerifier,
        redirectUri,
      });
      return { token: result.access_token, expiresIn: result.expires_in };
    },
  };
}
