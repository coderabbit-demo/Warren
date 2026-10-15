import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { Config } from '../config.js';
import { UnauthorizedError } from '../errors.js';

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export function authRouter(config: Config) {
  const router = Router();
  router.post('/auth/refresh', (req, res) => {
    const body = refreshSchema.parse(req.body);
    try {
      const claims = jwt.verify(body.refreshToken, config.JWT_REFRESH_SECRET) as { mid?: string; scope?: string[]; exp?: number; typ?: string };
      if (!claims.mid || !claims.exp || claims.typ !== 'refresh') throw new UnauthorizedError();
      const accessToken = jwt.sign({ mid: claims.mid, scope: claims.scope ?? [], typ: 'access' }, config.JWT_SECRET, { expiresIn: '15m' });
      res.json({ accessToken, tokenType: 'Bearer', expiresIn: 900 });
    } catch {
      throw new UnauthorizedError();
    }
  });
  return router;
}
