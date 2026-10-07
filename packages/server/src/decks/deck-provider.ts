import { type Catalog, validateDeck } from '@ytcg-game/engine';
import type { PlayerIdentity } from '../identity.ts';
import { type DeckChoice, joinOptionsSchema } from '../protocol.ts';

// Where a player's deck comes from. Throwing refuses the join.
export interface DeckProvider {
  deckFor(player: PlayerIdentity, options: unknown): Promise<DeckChoice>;
}

export class DeckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeckError';
  }
}

const DECK_RULES =
  'Deck invalide : 12 cartes différentes et un terrain, dont au moins 2 cartes à 1, 2 à 2 et 2 à 3, et au plus 3 cartes à 5 ou plus.';

// Until ytcg stores decks (phase 3): the deck and location sent by the client, checked against the catalog only.
export class CatalogDeckProvider implements DeckProvider {
  private readonly catalog: Catalog;

  constructor(catalog: Catalog) {
    this.catalog = catalog;
  }

  deckFor(_player: PlayerIdentity, options: unknown): Promise<DeckChoice> {
    const parsed = joinOptionsSchema.safeParse(options);
    if (!parsed.success) {
      return Promise.reject(new DeckError('Un deck est requis.'));
    }
    const { cards, location } = parsed.data.deck;
    const issues = validateDeck(this.catalog, cards);
    if (!this.catalog.locations.has(location)) {
      issues.push(`unknown location ${location}`);
    }
    if (issues.length > 0) {
      return Promise.reject(new DeckError(DECK_RULES));
    }
    return Promise.resolve(parsed.data.deck);
  }
}
