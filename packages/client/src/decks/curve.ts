import { type Catalog, deckCurveChecks, describeCurveRule } from '@ytcg-game/engine';

export interface CurveBar {
  label: string;
  count: number;
}

export interface CurveLine {
  text: string;
  actual: number;
  ok: boolean;
}

const LAST_BUCKET = 6;

// Cards of the game catalog only: a card the game does not know has no cost.
function knownCosts(catalog: Catalog, cards: readonly string[]): number[] {
  return cards.flatMap((id) => {
    const card = catalog.cards.get(id);
    return card === undefined ? [] : [card.cost];
  });
}

// Histogram 1…5 then 6+ (a 0 cost counts with the 1s).
export function curveBars(catalog: Catalog, cards: readonly string[]): CurveBar[] {
  const costs = knownCosts(catalog, cards).map((cost) => Math.min(Math.max(cost, 1), LAST_BUCKET));
  return Array.from({ length: LAST_BUCKET }, (_, index) => {
    const cost = index + 1;
    return { label: cost === LAST_BUCKET ? `${cost}+` : String(cost), count: costs.filter((c) => c === cost).length };
  });
}

// The engine rules, checked live against the current selection.
export function curveLines(catalog: Catalog, cards: readonly string[]): CurveLine[] {
  const known = cards.filter((id) => catalog.cards.has(id));
  return deckCurveChecks(catalog, known).map(({ rule, actual, ok }) => ({ text: describeCurveRule(rule), actual, ok }));
}
