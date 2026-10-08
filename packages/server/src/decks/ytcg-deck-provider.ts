import type { Catalog } from '@ytcg-game/engine';
import type { PlayerIdentity } from '../identity.ts';
import { type DeckChoice, deckRefOptionsSchema } from '../protocol.ts';
import { DeckError, type DeckProvider } from './deck-provider.ts';
import { assertGameRules } from './game-rules.ts';
import { type ServerDeck, type YtcgApiOptions, YtcgDeckApi } from './ytcg-deck-api.ts';

// Production: the player's ytcg deck (ownership checked by ytcg now), then the game's own rules.
export class YtcgDeckProvider implements DeckProvider {
  private readonly catalog: Catalog;
  private readonly api: YtcgDeckApi;

  constructor(catalog: Catalog, options: YtcgApiOptions) {
    this.catalog = catalog;
    this.api = new YtcgDeckApi(options);
  }

  async deckFor(player: PlayerIdentity, options: unknown): Promise<DeckChoice> {
    // Strict schema: an inline deck is never accepted here.
    const parsed = deckRefOptionsSchema.safeParse(options);
    if (!parsed.success) {
      throw new DeckError('Choisis un de tes decks Youl TCG pour jouer.');
    }
    const deck = await this.api.deck(parsed.data.deckId, player.id);
    return assertGameRules(this.catalog, toDeckChoice(deck));
  }
}

export function toDeckChoice(deck: ServerDeck): DeckChoice {
  return deck.terrain === null ? { cards: deck.cards } : { cards: deck.cards, location: deck.terrain };
}
