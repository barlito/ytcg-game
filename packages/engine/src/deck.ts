import type { Catalog } from './catalog.ts';
import type { Rng } from './rng.ts';
import { DECK_MINIMUM_BY_COST, DECK_SIZE, EXPENSIVE_FROM_COST, EXPENSIVE_MAXIMUM, OPENING_COST } from './rules.ts';

export type CurveRule =
  { kind: 'minimum'; cost: number; count: number } | { kind: 'maximum'; fromCost: number; count: number };

// One line per curve rule, with how many cards of the deck it counts: what a deck builder displays live.
export interface CurveCheck {
  rule: CurveRule;
  actual: number;
  ok: boolean;
}

export function deckCurveChecks(catalog: Catalog, deck: readonly string[]): CurveCheck[] {
  const costs = deck.map((id) => catalog.card(id).cost);
  const minimums = DECK_MINIMUM_BY_COST.map(({ cost, count }): CurveCheck => {
    const actual = costs.filter((c) => c === cost).length;
    return { rule: { kind: 'minimum', cost, count }, actual, ok: actual >= count };
  });
  const expensive = costs.filter((cost) => cost >= EXPENSIVE_FROM_COST).length;
  const maximum: CurveCheck = {
    rule: { kind: 'maximum', fromCost: EXPENSIVE_FROM_COST, count: EXPENSIVE_MAXIMUM },
    actual: expensive,
    ok: expensive <= EXPENSIVE_MAXIMUM,
  };
  return [...minimums, maximum];
}

export function deckCurveIssues(catalog: Catalog, deck: readonly string[]): string[] {
  return deckCurveChecks(catalog, deck)
    .filter((check) => !check.ok)
    .map(({ rule }) =>
      rule.kind === 'minimum'
        ? `a deck needs at least ${rule.count} cards costing ${rule.cost}`
        : `a deck holds at most ${rule.count} cards costing ${rule.fromCost} or more`,
    );
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
