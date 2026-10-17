import { describe, expect, it } from 'vitest';
import { CatalogError, describeCard } from '../src/index.ts';
import { type CardInput, type LocationInput, card, catalogWith, newGame, playTurn, powerAt, uidOf } from './support.ts';

const catalog = catalogWith([
  card('veteran', {
    abilities: [
      { trigger: 'endOfTurn', condition: { type: 'turnsOnBoard', min: 2 }, effect: { type: 'addPower', amount: 5 } },
    ],
  }),
  card('patient', {
    abilities: [
      { trigger: 'ongoing', condition: { type: 'turnsOnBoard', min: 1 }, effect: { type: 'addPower', amount: 2 } },
    ],
  }),
]);

function issuesOf(cards: CardInput[], locations: LocationInput[] = []): readonly string[] {
  try {
    catalogWith(cards, locations);
  } catch (error) {
    expect(error).toBeInstanceOf(CatalogError);
    return (error as CatalogError).issues;
  }
  throw new Error('expected a CatalogError');
}

describe('condition turnsOnBoard', () => {
  it('counts the turns started since the reveal', () => {
    const state = newGame(catalog, { p0: ['veteran'] });
    const turn1 = playTurn(catalog, state, { p0: [['veteran', 0]] }).state;
    expect(turn1.cards[uidOf(turn1, 0, 'veteran')]?.revealedTurn).toBe(1);
    const turn2 = playTurn(catalog, turn1).state;
    expect(powerAt(catalog, turn2, 0, 'veteran')).toBe(1);
    // End of turn 3: two turns after the reveal.
    const turn3 = playTurn(catalog, turn2).state;
    expect(powerAt(catalog, turn3, 0, 'veteran')).toBe(1 + 5);
  });

  it('works on an ongoing ability, from the turn after the reveal', () => {
    const state = newGame(catalog, { p0: ['patient'] });
    const turn1 = playTurn(catalog, state, { p0: [['patient', 0]] }).state;
    expect(powerAt(catalog, turn1, 0, 'patient')).toBe(1 + 2);
    // turn1 is the state at the start of turn 2: one turn after the reveal.
    expect(turn1.turn).toBe(2);
  });

  it('is refused on a terrain and written in French', () => {
    const terrain: LocationInput = {
      id: 'loc-x',
      name: 'x',
      abilities: [
        {
          trigger: 'endOfTurn',
          condition: { type: 'turnsOnBoard', min: 1 },
          target: { type: 'cards', side: 'all' },
          effect: { type: 'addPower', amount: 1 },
        },
      ],
    };
    expect(issuesOf([], [terrain]).join()).toContain('turnsOnBoard');
    expect(describeCard(catalog, catalog.card('veteran'))).toEqual([
      'En fin de tour : après 2 tours en jeu, +5 puissance.',
    ]);
  });
});
