import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { ConflictError, DomainError } from '../errors.js';
import type { IdempotencyKeysRepository } from '../repositories/idempotencyKeys.js';

export interface IdempotentResponse<T> { status: number; body: T; }

export function makeWithIdempotency(repository: IdempotencyKeysRepository) {
  return async function withIdempotency<T>(req: Request, handler: () => Promise<IdempotentResponse<T>>): Promise<IdempotentResponse<T>> {
    const key = req.header('idempotency-key');
    if (!key) throw new DomainError('Idempotency-Key header required', 400, 'missing_idempotency_key');
    const hash = createHash('sha256').update(JSON.stringify(req.body ?? null)).digest('hex');
    const saved = await repository.find(req.auth.merchantId, key);
    if (saved) {
      if (saved.request_hash !== hash) throw new ConflictError('Idempotency key reused with a different request');
      return saved.response as IdempotentResponse<T>;
    }
    const result = await handler();
    await repository.save(req.auth.merchantId, key, hash, result);
    return result;
  };
}
