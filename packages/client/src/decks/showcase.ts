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

export interface FanCard {
  definition: CardDefinition;
  holo: boolean;
}

// ytcg resets its daily quotas at midnight Europe/Paris: the showcase changes on the same clock.
export const DAY_TIMEZONE = 'Europe/Paris';

export function dayKey(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DAY_TIMEZONE }).format(now);
}

function hash(text: string): number {
  let h = 2166136261;
  for (const char of text) {
    h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  }
  return h >>> 0;
}

// Small seeded generator (mulberry32): the same seed always gives the same sequence.
function seeded(seed: string): () => number {
  let state = hash(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Three random cards of the pool, each holo or not at random, identical all day (the seed is the day) and new after midnight.
export function dailyFan(
  cards: readonly CardDefinition[],
  fallback: readonly CardDefinition[],
  day: string,
): FanCard[] {
  const pool = [...(cards.length >= 3 ? cards : fallback)].sort((a, b) => a.id.localeCompare(b.id));
  const random = seeded(`fan:${day}`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const other = pool[j];
    const current = pool[i];
    if (other !== undefined && current !== undefined) {
      pool[i] = other;
      pool[j] = current;
    }
  }
  return pickFan(pool.slice(0, 3), []).map((definition) => ({
    definition,
    holo: seeded(`holo:${day}:${definition.id}`)() < 0.5,
  }));
}
