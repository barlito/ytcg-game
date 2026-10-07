import { loadDataDir } from '@ytcg-game/engine/node';
import { createGameServer, roomServices } from './app.ts';
import { DevAuthenticator } from './auth/dev-authenticator.ts';
import { readConfig } from './config.ts';

// Development entry point: no ytcg session, players just pick a name.
const config = readConfig(process.env);
await createGameServer(roomServices(loadDataDir(), new DevAuthenticator(), config)).listen(config.PORT);
