import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(2567),
  TURN_SECONDS: z.coerce.number().int().min(5).default(60),
  // Reading pause after a resolution: base + per revealed card or terrain, capped (client spotlight + landing ≈ 2.75 s per card).
  REVEAL_PAUSE_SECONDS: z.coerce.number().min(0).max(30).default(3),
  REVEAL_SECONDS_PER_CARD: z.coerce.number().min(0).max(10).default(5),
  REVEAL_PAUSE_MAX_SECONDS: z.coerce.number().min(0).max(60).default(40),
  RECONNECT_SECONDS: z.coerce.number().int().min(0).default(30),
  YTCG_JWT_PUBLIC_KEY_PATH: z.string().min(1).optional(),
  YTCG_JWT_ALGORITHM: z.string().min(1).default('RS256'),
  // ytcg origin reachable from the game server (decks), and the bearer secret of its duel server API.
  YTCG_API_URL: z.url({ protocol: /^https?$/ }).optional(),
  DUEL_SERVER_TOKEN: z.string().min(1).optional(),
});

export type ServerConfig = z.output<typeof envSchema>;

const PRODUCTION_KEYS = ['YTCG_JWT_PUBLIC_KEY_PATH', 'YTCG_API_URL', 'DUEL_SERVER_TOKEN'] as const;

export type ProductionConfig = ServerConfig & Record<(typeof PRODUCTION_KEYS)[number], string>;

export function readConfig(env: NodeJS.ProcessEnv): ServerConfig {
  return envSchema.parse(env);
}

// src/main.ts: the ytcg session and decks are mandatory, the server refuses to boot without them.
export function readProductionConfig(env: NodeJS.ProcessEnv): ProductionConfig {
  const config = readConfig(env);
  const missing = PRODUCTION_KEYS.filter((key) => config[key] === undefined);
  if (missing.length > 0) {
    throw new Error(`missing environment variables: ${missing.join(', ')}`);
  }
  return config as ProductionConfig; // every production key was checked just above
}
