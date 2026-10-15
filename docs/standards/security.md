# Security

Every read and write must be scoped to `req.auth.merchantId`. Repository methods should accept the merchant ID so it is difficult to omit the tenant boundary.

Never log request bodies on payment, refund, or merchant routes. A body may contain customer or payment details even when a request fails validation.

Outbound requests to merchant-supplied URLs must use `https` and resolve to public addresses. Block loopback, private, and link-local ranges, including `169.254.169.254`. Do not return the remote response body to the caller.

All SQL must be parameterized. Never interpolate user input into SQL text. Secrets come from environment variables; never commit secret values or fallbacks.
