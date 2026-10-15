import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  PAYGRID_API_KEY: z.string().min(1),
  PAYGRID_BASE_URL: z.url(),
  PROVIDER_WEBHOOK_SECRET: z.string().min(16),
  WEBHOOK_SIGNING_SECRET: z.string().min(16),
  LOG_LEVEL: z.string().default('info'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return envSchema.parse(env);
}
