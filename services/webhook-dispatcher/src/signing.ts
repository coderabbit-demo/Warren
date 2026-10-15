import { createHmac } from 'node:crypto';

function signingSecret(): string {
  const secret =
    process.env.WEBHOOK_SIGNING_SECRET ??
    'wrn_demo_4f9c2e7a1b8d3f60c5e9a2b7d4f1c8e3';
  return secret;
}

export function signPayload(
  payload: string,
  secret: string = signingSecret(),
): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}
