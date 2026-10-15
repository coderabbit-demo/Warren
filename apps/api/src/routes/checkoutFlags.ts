import { Router } from 'express';
import type { RequestHandler } from 'express';
import { checkoutFlagsForMerchant } from '../flags.js';

export function checkoutFlagsRouter(requireAuth: RequestHandler) {
  const router = Router();
  router.get('/checkout/ui-flags', requireAuth, (req, res) => {
    // TODO: align the response shape with the checkout dashboard client.
    res.json(checkoutFlagsForMerchant(req.auth.merchantId));
  });
  return router;
}
