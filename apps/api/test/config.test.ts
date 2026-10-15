import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { selectPaymentProvider } from '../src/services/paymentService.js';

const required = {
  DATABASE_URL: 'postgres://example.com/warren',
  JWT_SECRET: 'example-jwt-secret-for-tests',
  PAYGRID_API_KEY: 'wrn_demo_4f9c2e7a1b8d3f60c5e9a2b7d4f1c8e3',
  PAYGRID_BASE_URL: 'https://paygrid.example.com',
  PROVIDER_WEBHOOK_SECRET: 'example-provider-secret-for-tests',
  WEBHOOK_SIGNING_SECRET: 'example-signing-secret-for-tests',
};

describe('provider configuration', () => {
  it('keeps the first provider as the default', () => {
    const config = loadConfig(required);
    expect(config.PAYMENTS_PROVIDER_V2).toBe(false);
    expect(selectPaymentProvider(config).name).toBe('paygrid-v1');
  });

  it('selects V2 with a complete environment', () => {
    const config = loadConfig({
      ...required,
      PAYMENTS_PROVIDER_V2: 'true',
      PAYGRID_V2_API_KEY: 'wrn_demo_2a4c6e8f1029384756aabbccddeeff00',
      PAYGRID_V2_BASE_URL: 'https://paygrid-v2.example.com',
      PAYGRID_V2_WEBHOOK_SECRET: 'example-v2-secret-for-tests',
    });
    expect(config.PAYMENTS_PROVIDER_V2).toBe(true);
    expect(selectPaymentProvider(config).name).toBe('paygrid-v2');
  });

  it('requires V2 credentials when the flag is enabled', () => {
    expect(() =>
      loadConfig({ ...required, PAYMENTS_PROVIDER_V2: 'true' }),
    ).toThrow();
  });

  it('rejects values other than an explicit true or false', () => {
    expect(() =>
      loadConfig({ ...required, PAYMENTS_PROVIDER_V2: '1' }),
    ).toThrow();
  });
});
