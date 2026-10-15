import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../errors.js';
import { logger } from '../logger.js';

export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ code: 'invalid_request', issues: err.issues });
    return;
  }
  if (err instanceof DomainError) {
    res.status(err.statusCode).json({ code: err.code, message: err.message });
    return;
  }
  logger.error({ err, method: req.method, path: req.originalUrl, body: req.body }, 'Unhandled request error');
  res.status(500).json({ code: 'internal_error', message: 'Internal server error' });
};
