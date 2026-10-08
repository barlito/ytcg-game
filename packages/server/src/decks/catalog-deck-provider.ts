import type { Catalog } from '@ytcg-game/engine';
import type { PlayerIdentity } from '../identity.ts';
import { type DeckChoice, devJoinOptionsSchema } from '../protocol.ts';
import { DeckError, type DeckProvider } from './deck-provider.ts';
import { assertGameRules } from './game-rules.ts';

// Development only (wired by src/dev.ts): the deck sent by the client, checked against the catalog, no ownership.
export class CatalogDeckProvider implements DeckProvider {
  private readonly catalog: Catalog;

  constructor(catalog: Catalog) {
    this.catalog = catalog;
  }

  deckFor(_player: PlayerIdentity, options: unknown): Promise<DeckChoice> {
    const parsed = devJoinOptionsSchema.safeParse(options);
    if (!parsed.success) {
      return Promise.reject(new DeckError('Un deck est requis.'));
    }
    const deck = parsed.data.deck;
    return Promise.resolve().then(() => assertGameRules(this.catalog, deck));
  }
}
