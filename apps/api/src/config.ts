import { z } from 'zod';

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(16),
    PAYGRID_API_KEY: z.string().min(1),
    PAYGRID_BASE_URL: z.url(),
    PAYGRID_V2_API_KEY: z.string().optional(),
    PAYGRID_V2_BASE_URL: z.url().optional(),
    PAYGRID_V2_WEBHOOK_SECRET: z.string().optional(),
    PAYMENTS_PROVIDER_V2: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    PROVIDER_WEBHOOK_SECRET: z.string().min(16),
    WEBHOOK_SIGNING_SECRET: z.string().min(16),
    LOG_LEVEL: z.string().default('info'),
  })
  .superRefine((env, context) => {
    if (
      env.PAYMENTS_PROVIDER_V2 &&
      (!env.PAYGRID_V2_API_KEY ||
        !env.PAYGRID_V2_BASE_URL ||
        !env.PAYGRID_V2_WEBHOOK_SECRET)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'PayGrid V2 credentials and URL are required when the provider flag is enabled',
      });
    }
  });

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return envSchema.parse(env);
}
