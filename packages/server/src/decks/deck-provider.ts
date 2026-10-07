import { type Catalog, validateDeck } from '@ytcg-game/engine';
import type { PlayerIdentity } from '../identity.ts';
import { joinOptionsSchema } from '../protocol.ts';

// Where a player's deck comes from. Throwing refuses the join.
export interface DeckProvider {
  deckFor(player: PlayerIdentity, options: unknown): Promise<string[]>;
}

export class DeckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeckError';
  }
}

// Until ytcg stores decks (phase 3): the deck sent by the client, checked against the game catalog only.
export class CatalogDeckProvider implements DeckProvider {
  private readonly catalog: Catalog;

  constructor(catalog: Catalog) {
    this.catalog = catalog;
  }

  deckFor(_player: PlayerIdentity, options: unknown): Promise<string[]> {
    const parsed = joinOptionsSchema.safeParse(options);
    if (!parsed.success) {
      return Promise.reject(new DeckError('a deck is required'));
    }
    const issues = validateDeck(this.catalog, parsed.data.deck);
    if (issues.length > 0) {
      return Promise.reject(new DeckError(issues.join(', ')));
    }
    return Promise.resolve(parsed.data.deck);
  }
}
