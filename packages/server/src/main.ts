import { readFileSync } from 'node:fs';
import { loadDataDir } from '@ytcg-game/engine/node';
import { createGameServer, roomServices } from './app.ts';
import { JwtAuthenticator } from './auth/jwt-authenticator.ts';
import { readProductionConfig } from './config.ts';
import { YtcgDeckProvider } from './decks/ytcg-deck-provider.ts';

// Production entry point: players are authenticated by their ytcg session and play their ytcg decks.
const config = readProductionConfig(process.env);
const catalog = loadDataDir();
const authenticator = await JwtAuthenticator.fromPublicKey(
  readFileSync(config.YTCG_JWT_PUBLIC_KEY_PATH, 'utf8'),
  config.YTCG_JWT_ALGORITHM,
);
const decks = new YtcgDeckProvider(catalog, { baseUrl: config.YTCG_API_URL, token: config.DUEL_SERVER_TOKEN });
await createGameServer(roomServices({ catalog, authenticator, decks }, config)).listen(config.PORT);
