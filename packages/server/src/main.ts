import { readFileSync } from 'node:fs';
import { loadDataDir } from '@ytcg-game/engine/node';
import { createGameServer, roomServices } from './app.ts';
import { JwtAuthenticator } from './auth/jwt-authenticator.ts';
import { readConfig } from './config.ts';

// Production entry point: players are authenticated by their ytcg session.
const config = readConfig(process.env);
if (config.YTCG_JWT_PUBLIC_KEY_PATH === undefined) {
  throw new Error('YTCG_JWT_PUBLIC_KEY_PATH is required');
}
const authenticator = await JwtAuthenticator.fromPublicKey(
  readFileSync(config.YTCG_JWT_PUBLIC_KEY_PATH, 'utf8'),
  config.YTCG_JWT_ALGORITHM,
);
await createGameServer(roomServices(loadDataDir(), authenticator, config)).listen(config.PORT);
