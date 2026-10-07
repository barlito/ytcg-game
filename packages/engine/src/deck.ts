import type { Catalog } from './catalog.ts';
import type { Rng } from './rng.ts';
import { DECK_MINIMUM_BY_COST, DECK_SIZE, EXPENSIVE_FROM_COST, EXPENSIVE_MAXIMUM, OPENING_COST } from './rules.ts';

export function deckCurveIssues(catalog: Catalog, deck: readonly string[]): string[] {
  const costs = deck.map((id) => catalog.card(id).cost);
  const issues = DECK_MINIMUM_BY_COST.filter(({ cost, count }) => costs.filter((c) => c === cost).length < count).map(
    ({ cost, count }) => `a deck needs at least ${count} cards costing ${cost}`,
  );
  if (costs.filter((cost) => cost >= EXPENSIVE_FROM_COST).length > EXPENSIVE_MAXIMUM) {
    issues.push(`a deck holds at most ${EXPENSIVE_MAXIMUM} cards costing ${EXPENSIVE_FROM_COST} or more`);
  }
  return issues;
}

// A random deck that respects the curve, drawn from the pool (default: every card), or null when impossible.
export function buildRandomDeck(
  catalog: Catalog,
  rng: Rng,
  pool: readonly string[] = [...catalog.cards.keys()],
): string[] | null {
  const shuffled = rng.shuffle([...new Set(pool)]);
  const costOf = (id: string): number => catalog.card(id).cost;
  const deck = DECK_MINIMUM_BY_COST.flatMap(({ cost, count }) =>
    shuffled.filter((id) => costOf(id) === cost).slice(0, count),
  );
  let expensive = 0;
  for (const id of shuffled) {
    if (deck.length >= DECK_SIZE) {
      break;
    }
    const isExpensive = costOf(id) >= EXPENSIVE_FROM_COST;
    if (!deck.includes(id) && (!isExpensive || expensive < EXPENSIVE_MAXIMUM)) {
      deck.push(id);
      expensive += isExpensive ? 1 : 0;
    }
  }
  return deck.length === DECK_SIZE && deckCurveIssues(catalog, deck).length === 0 ? deck : null;
}

// Moves a card costing OPENING_COST into the first `opening` positions when none is there and the deck holds one.
export function guaranteeOpening<T>(cards: T[], costOf: (card: T) => number, opening: number, rng: Rng): void {
  if (cards.slice(0, opening).some((card) => costOf(card) === OPENING_COST)) {
    return;
  }
  const candidates = cards.flatMap((card, index) => (index >= opening && costOf(card) === OPENING_COST ? [index] : []));
  if (candidates.length === 0) {
    return;
  }
  const from = rng.pick(candidates);
  const to = rng.int(Math.min(opening, cards.length));
  [cards[from], cards[to]] = [cards[to] as T, cards[from] as T];
}
