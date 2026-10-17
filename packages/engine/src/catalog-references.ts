import type { EffectParams } from './abilities/effects.ts';
import type { CardDefinition, LocationDefinition } from './catalog.ts';

// addToHand and transform name a card of the catalog: a typo must fail at load time, and a terrain is never a card.
export function referenceIssues(
  cards: ReadonlyMap<string, CardDefinition>,
  locations: ReadonlyMap<string, LocationDefinition>,
): string[] {
  const holders = [
    ...[...cards.values()].map((card) => ({ id: card.id, label: `card ${card.id}`, abilities: card.abilities })),
    ...[...locations.values()].map((location) => ({
      id: location.id,
      label: `location ${location.id}`,
      abilities: location.abilities,
    })),
  ];
  return holders.flatMap(({ id, label, abilities }) =>
    abilities.flatMap(({ params }) =>
      params.effect.flatMap((effect) => effectReferenceIssues(effect, id, cards).map((issue) => `${label}: ${issue}`)),
    ),
  );
}

// An evolved form (deckable false) only ever enters play through a transformation, never in a hand.
function effectReferenceIssues(
  effect: EffectParams,
  holder: string,
  cards: ReadonlyMap<string, CardDefinition>,
): string[] {
  if (effect.type === 'addToHand' && effect.card !== undefined) {
    const named = cards.get(effect.card);
    if (named === undefined) {
      return [`addToHand refers to unknown card "${effect.card}"`];
    }
    return named.deckable ? [] : [`addToHand cannot give the evolved form "${effect.card}" (deckable false)`];
  }
  if (effect.type === 'transform') {
    if (!cards.has(effect.into)) {
      return [`transform refers to unknown card "${effect.into}"`];
    }
    return effect.into === holder ? ['a card cannot transform into itself'] : [];
  }
  return [];
}
