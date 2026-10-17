import { describe, expect, it } from 'vitest';
import { CatalogError, describeCard, powerBreakdown } from '../src/index.ts';
import { type CardInput, card, catalogWith, newGame, playTurn, powerAt, uidOf } from './support.ts';

const perStack = { type: 'addPowerPerStack', amount: 1, status: 'high' } as const;

const catalog = catalogWith([
  // Barlito Waa-like: défoncée (×3), +1 per stack of Défonce while défoncée.
  card('tripper', {
    power: 3,
    abilities: [
      { trigger: 'onReveal', effect: { type: 'addStatus', status: 'high', stacks: 3 } },
      { trigger: 'ongoing', condition: { type: 'status', status: 'high' }, effect: perStack },
    ],
  }),
  // Same bonus without the status condition: the default Défonce rule still applies.
  card('plain-tripper', {
    power: 3,
    abilities: [
      { trigger: 'onReveal', effect: { type: 'addStatus', status: 'high', stacks: 2 } },
      { trigger: 'ongoing', effect: perStack },
    ],
  }),
  card('dealer', {
    abilities: [
      {
        trigger: 'onReveal',
        target: { type: 'cards', side: 'all', status: 'high' },
        effect: { type: 'addStatus', status: 'high', stacks: 2 },
      },
    ],
  }),
]);

function issuesOf(cards: CardInput[]): readonly string[] {
  try {
    catalogWith(cards);
  } catch (error) {
    expect(error).toBeInstanceOf(CatalogError);
    return (error as CatalogError).issues;
  }
  throw new Error('expected a CatalogError');
}

describe('effect addPowerPerStack', () => {
  it('gives power per stack of the card itself, and the card keeps it (its Défonce effect overrides the loss)', () => {
    const state = playTurn(catalog, newGame(catalog, { p0: ['tripper'] }), { p0: [['tripper', 0]] }).state;
    expect(powerAt(catalog, state, 0, 'tripper')).toBe(6);
    const later = playTurn(catalog, state, {}).state;
    expect(powerAt(catalog, later, 0, 'tripper')).toBe(6);
  });

  it('follows the stacks: more Défonce, more power', () => {
    let state = newGame(catalog, { p0: ['tripper', 'dealer'] });
    state = playTurn(catalog, state, { p0: [['tripper', 0]] }).state;
    state = playTurn(catalog, state, { p0: [['dealer', 0]] }).state;
    expect(state.cards[uidOf(state, 0, 'tripper')]?.statuses.high).toBe(5);
    expect(powerAt(catalog, state, 0, 'tripper')).toBe(8);
  });

  it('shows in the breakdown as an ongoing bonus from the card itself', () => {
    const state = playTurn(catalog, newGame(catalog, { p0: ['tripper'] }), { p0: [['tripper', 0]] }).state;
    const breakdown = powerBreakdown(catalog, state, uidOf(state, 0, 'tripper'));
    expect(breakdown.ongoing).toEqual([{ from: 'card', defId: 'tripper', amount: 3 }]);
  });

  it('without a Défonce condition, the default rule still wears the card down', () => {
    const state = playTurn(catalog, newGame(catalog, { p0: ['plain-tripper'] }), { p0: [['plain-tripper', 0]] }).state;
    // 3 printed + 2 per stack − 2 lost at the end of the turn.
    expect(powerAt(catalog, state, 0, 'plain-tripper')).toBe(3);
  });

  it('reads « par cumul de Défonce » in the text', () => {
    expect(describeCard(catalog, catalog.card('tripper'))).toEqual([
      'À la révélation : devient défoncée (×3).',
      'Défoncée : +1 puissance par cumul de Défonce.',
    ]);
  });

  it('only targets the card itself', () => {
    const issues = issuesOf([
      card('generous', {
        abilities: [{ trigger: 'ongoing', target: { type: 'cards', side: 'all' }, effect: perStack }],
      }),
    ]);
    expect(issues.some((issue) => issue.includes('"addPowerPerStack" reads the stacks of the card itself'))).toBe(true);
  });

  it('refuses an amount of 0', () => {
    const issues = issuesOf([
      card('zero', { abilities: [{ trigger: 'ongoing', effect: { ...perStack, amount: 0 } }] }),
    ]);
    expect(issues.length).toBeGreaterThan(0);
  });
});
