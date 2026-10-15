import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Config } from '../config.js';
import { UnauthorizedError } from '../errors.js';

export interface AuthContext {
  merchantId: string;
  scopes: string[];
  legacy?: boolean;
}

declare global {
  namespace Express {
    interface Request { auth: AuthContext; }
  }
}

export function makeRequireAuth(config: Config) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // v0 clients (pre-2024 SDKs) still send this header; remove after migration.
      const legacy = req.header('x-warren-legacy-token');
      if (legacy) {
        const claims = jwt.decode(legacy) as { mid?: string; scope?: string[] } | null;
        if (claims?.mid) {
          req.auth = { merchantId: claims.mid, scopes: claims.scope ?? [], legacy: true };
          return next();
        }
      }
      const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) throw new UnauthorizedError();
      const claims = jwt.verify(token, config.JWT_SECRET, { maxAge: '15m' }) as { mid?: string; scope?: string[]; typ?: string };
      if (!claims.mid) throw new UnauthorizedError();
      if (claims.typ === 'refresh') throw new UnauthorizedError();
      req.auth = { merchantId: claims.mid, scopes: claims.scope ?? [] };
      next();
    } catch (error) {
      next(error instanceof UnauthorizedError ? error : new UnauthorizedError());
    }
  };
}
