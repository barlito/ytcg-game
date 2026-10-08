import { type Catalog, DECK_SIZE, deckCurveChecks, describeCurveRule } from '@ytcg-game/engine';
import type { DeckChoice } from '../protocol.ts';
import { DeckError } from './deck-provider.ts';

// The game's own deck rules (ytcg only checks ownership): size, catalog, terrain, cost curve.
export function gameRuleRefusal(catalog: Catalog, deck: DeckChoice): string | null {
  const unknown = deck.cards.filter((id) => !catalog.cards.has(id)).length;
  if (unknown > 0) {
    return unknown === 1
      ? 'Ce deck contient 1 carte pas encore jouable dans le duel : remplace-la.'
      : `Ce deck contient ${unknown} cartes pas encore jouables dans le duel : remplace-les.`;
  }
  if (deck.cards.length !== DECK_SIZE || new Set(deck.cards).size !== deck.cards.length) {
    return `Un deck contient exactement ${DECK_SIZE} cartes différentes.`;
  }
  if (deck.location !== undefined && !catalog.locations.has(deck.location)) {
    return "Ce terrain n'est pas encore jouable dans le duel : choisis-en un autre ou aucun.";
  }
  const broken = deckCurveChecks(catalog, deck.cards).filter((check) => !check.ok);
  if (broken.length > 0) {
    const rules = broken.map(({ rule, actual }) => `${describeCurveRule(rule).toLowerCase()} (${actual} dans ce deck)`);
    return `Courbe de coûts à revoir : ${rules.join(' ; ')}.`;
  }
  return null;
}

export function assertGameRules(catalog: Catalog, deck: DeckChoice): DeckChoice {
  const refusal = gameRuleRefusal(catalog, deck);
  if (refusal !== null) {
    throw new DeckError(refusal);
  }
  return deck;
}
