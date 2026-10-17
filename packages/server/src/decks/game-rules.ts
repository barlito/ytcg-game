import { type Catalog, DECK_SIZE, deckCurveChecks, describeCurveRule, isDeckable } from '@ytcg-game/engine';
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
  const evolved = evolvedRefusal(catalog, deck.cards);
  if (evolved !== null) {
    return evolved;
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

// Evolved forms are collectible but only ever enter play through a transformation.
function evolvedRefusal(catalog: Catalog, cards: readonly string[]): string | null {
  const names = cards.filter((id) => !isDeckable(catalog, id)).map((id) => `« ${catalog.card(id).name} »`);
  if (names.length === 0) {
    return null;
  }
  return names.length === 1
    ? `${names.join('')} ne peut pas être mise dans un deck : c'est une forme évoluée.`
    : `${names.join(', ')} ne peuvent pas être mises dans un deck : ce sont des formes évoluées.`;
}

export function assertGameRules(catalog: Catalog, deck: DeckChoice): DeckChoice {
  const refusal = gameRuleRefusal(catalog, deck);
  if (refusal !== null) {
    throw new DeckError(refusal);
  }
  // Holo only counts for cards of the deck (a stray id would be refused by the engine).
  return deck.holo === undefined ? deck : { ...deck, holo: deck.holo.filter((id) => deck.cards.includes(id)) };
}
