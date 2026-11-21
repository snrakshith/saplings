import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

const hash = (value: string) => createHash('sha256').update(value).digest();

export const localRequestsOnly: RequestHandler = (req, res, next) => {
  if (!/^(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/.test(req.headers.host ?? '')) {
    res.status(403).json({ error: 'Use the local console URL.' });
    return;
  }
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy':
      "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; style-src 'self' 'unsafe-inline'; form-action 'self'",
  });
  next();
};

export function authorizeConsole(token: string): RequestHandler {
  if (token.length < 32) throw new Error('SAPLINGS_CONSOLE_TOKEN must be at least 32 characters.');
  const expected = hash('Bearer ' + token);
  return (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!timingSafeEqual(expected, hash(req.get('authorization') ?? ''))) {
      res.status(401).json({ error: 'Enter the access token from the console server.' });
      return;
    }
    if (['POST', 'PUT'].includes(req.method) && !req.is('application/json')) {
      res.status(415).json({ error: 'Send JSON with Content-Type application/json.' });
      return;
    }
    next();
  };
}
