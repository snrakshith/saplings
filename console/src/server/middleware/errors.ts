import type { ErrorRequestHandler, RequestHandler } from 'express';
import { InputError } from '../input.js';

export const apiNotFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Console API endpoint not found.' });
};

export const handleError: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof InputError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (
    error?.type === 'entity.parse.failed' ||
    error?.type === 'entity.too.large' ||
    error?.status === 415
  ) {
    res
      .status(error.status)
      .json({ error: 'Send a valid JSON document under 8 MB without compression.' });
    return;
  }
  console.error('Console request failed', error instanceof Error ? error.name : 'Unknown error');
  res.status(500).json({ error: 'The console could not complete this request.' });
};
