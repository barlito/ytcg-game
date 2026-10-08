import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(2567),
  TURN_SECONDS: z.coerce.number().int().min(5).default(60),
  REVEAL_PAUSE_SECONDS: z.coerce.number().min(0).max(30).default(5),
  RECONNECT_SECONDS: z.coerce.number().int().min(0).default(30),
  YTCG_JWT_PUBLIC_KEY_PATH: z.string().min(1).optional(),
  YTCG_JWT_ALGORITHM: z.string().min(1).default('RS256'),
});

export type ServerConfig = z.output<typeof envSchema>;

export function readConfig(env: NodeJS.ProcessEnv): ServerConfig {
  return envSchema.parse(env);
}
