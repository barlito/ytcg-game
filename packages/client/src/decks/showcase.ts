import type { CardDefinition, Catalog } from '@ytcg-game/engine';
import type { Deck } from '../ytcg/schemas.ts';
import { rarityKey } from '../components/card/rarity.ts';

const RANK = { common: 0, uncommon: 1, rare: 2, legendary: 3, unique: 4 } as const;

export function rarityRank(card: Pick<CardDefinition, 'rarity' | 'unique'>): number {
  return RANK[rarityKey(card)];
}

function byShowiness(a: CardDefinition, b: CardDefinition): number {
  return rarityRank(b) - rarityRank(a) || b.power - a.power || a.name.localeCompare(b.name, 'fr');
}

// The three cards of the home fan [left, centre, right], the most striking one in the middle; `fallback` when short.
export function pickFan(cards: readonly CardDefinition[], fallback: readonly CardDefinition[]): CardDefinition[] {
  const pool = cards.length >= 3 ? cards : fallback;
  const [best, second, third] = [...pool].sort(byShowiness);
  return best === undefined || second === undefined || third === undefined ? [] : [second, best, third];
}

// Artwork of the most striking known card of a deck, for its tile.
export function deckCover(catalog: Catalog, deck: Pick<Deck, 'cards'>): string | null {
  const known = deck.cards.flatMap((id) => catalog.cards.get(id) ?? []);
  return [...known].sort(byShowiness)[0]?.image ?? null;
}
