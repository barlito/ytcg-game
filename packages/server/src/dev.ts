import { loadDataDir } from '@ytcg-game/engine/node';
import { createGameServer, roomServices } from './app.ts';
import { DevAuthenticator } from './auth/dev-authenticator.ts';
import { readConfig } from './config.ts';
import { CatalogDeckProvider } from './decks/catalog-deck-provider.ts';

// Development entry point: no ytcg session, players pick a name and send an inline deck.
const config = readConfig(process.env);
const catalog = loadDataDir();
const services = { catalog, authenticator: new DevAuthenticator(), decks: new CatalogDeckProvider(catalog) };
await createGameServer(roomServices(services, config)).listen(config.PORT);
