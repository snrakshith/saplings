import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type { AuthenticationAdapter } from '@saplings/sdk';

const sessionName = 'saplings-starter-session';
const visitorName = 'saplings-miner-visitor';

export class RequestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function body(req: Request): Record<string, unknown> {
  if (!req.is('application/json')) throw new RequestError('Send JSON.', 415);
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
    throw new RequestError('Expected a JSON object.');
  if (req.get('origin') && URL.parse(req.get('origin')!)?.host !== req.get('host'))
    throw new RequestError('Cross-origin write denied.', 403);
  return req.body as Record<string, unknown>;
}

function cookies(req: Request) {
  return new Map(
    (req.get('cookie') ?? '')
      .split(';')
      .map((part) => part.trim().split('=', 2) as [string, string]),
  );
}

export function createServiceAuth(authentication: AuthenticationAdapter, secret: string) {
  if (secret.length < 32) throw new Error('A 32-character visitor secret is required.');
  const sign = (value: string) => createHmac('sha256', secret).update(value).digest();
  const cookieSettings = {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/api',
  };

  async function identity(req: Request, required: boolean) {
    const header = req.get('authorization');
    if (header && !/^Bearer \S+$/.test(header)) throw new RequestError('Invalid credentials.', 401);
    const token = header?.slice(7) ?? cookies(req).get(sessionName);
    const principal = token && (await authentication.verifyAccessToken(token));
    if (!principal && (required || token)) throw new RequestError('Sign in to continue.', 401);
    return principal || undefined;
  }
  function visitor(req: Request) {
    const [id, proof] = (cookies(req).get(visitorName) ?? '').split('.');
    if (!/^[a-f0-9]{32}$/.test(id) || !/^[a-f0-9]{64}$/.test(proof ?? '')) return;
    if (timingSafeEqual(sign(id), Buffer.from(proof, 'hex'))) return 'a:' + id;
  }
  function consent(req: Request, res: Response, enabled: boolean) {
    if (!enabled) return res.clearCookie(visitorName, cookieSettings);
    if (!visitor(req)) {
      const id = randomBytes(16).toString('hex');
      res.cookie(visitorName, id + '.' + sign(id).toString('hex'), {
        ...cookieSettings,
        maxAge: 90 * 86400000,
      });
    }
  }
  async function signIn(res: Response, token: unknown) {
    if (typeof token !== 'string' || !(await authentication.verifyAccessToken(token)))
      throw new RequestError('Invalid credentials.', 401);
    res.cookie(sessionName, token, cookieSettings);
  }
  function signOut(res: Response) {
    res.clearCookie(sessionName, cookieSettings);
    res.clearCookie(visitorName, cookieSettings);
  }
  return { identity, visitor, consent, signIn, signOut };
}

export function createLocalLogin(tenantId: string) {
  const credentials = [
    {
      label: 'author',
      permissions: [
        'config:read',
        'config:edit',
        'config:review',
        'config:public',
        'miner:read',
        'miner:admin',
        'miner:privacy',
      ],
    },
    {
      label: 'reviewer',
      permissions: ['config:read', 'config:review', 'config:public', 'miner:read'],
    },
    { label: 'member', permissions: [] },
  ].map((actor) => ({ ...actor, token: randomBytes(32).toString('base64url') }));
  const authentication: AuthenticationAdapter = {
    async verifyAccessToken(token) {
      const actor = credentials.find((entry) => entry.token === token);
      if (actor)
        return { tenantId, userId: actor.label, roles: [], permissions: actor.permissions };
    },
  };
  return { authentication, credentials };
}
