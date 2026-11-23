import { correlationId, type Middleware } from '@saplings/middleware';
import { Defender } from '@saplings/security';
import type { RequestHandler } from 'express';

export function requestPolicy(origin?: URL): [Middleware, RequestHandler] {
  const security = new Defender({
    policy: {
      allowedOrigins: origin ? [origin.origin] : undefined,
      maxContentLength: 1024 * 1024,
    },
  });
  return [correlationId(), security.preflight()];
}
