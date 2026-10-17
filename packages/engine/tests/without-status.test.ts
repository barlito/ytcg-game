import { describe, expect, it } from 'vitest';
import { CatalogError, type GameState, type PlayerIndex, describeCard } from '../src/index.ts';
import { type CardInput, card, catalogWith, newGame, playTurn, powerAt, uidOf } from './support.ts';

const catalog = catalogWith([
  card('v1'),
  card('stoned', { statuses: ['high'] }),
  // Warnyx-like: one random other card here that is not défoncée yet, any side.
  card('dealer', {
    abilities: [
      {
        trigger: 'onReveal',
        target: { type: 'cards', side: 'all', withoutStatus: 'high', pick: 'random' },
        effect: { type: 'addStatus', status: 'high' },
      },
    ],
  }),
  card('sober-fan', {
    power: 0,
    abilities: [
      {
        trigger: 'ongoing',
        effect: { type: 'addPowerPerCard', amount: 1, count: { side: 'all', withoutStatus: 'high' } },
      },
    ],
  }),
  card('sober-counter', {
    abilities: [
      {
        trigger: 'onReveal',
        condition: { type: 'count', side: 'all', withoutStatus: 'high', min: 2 },
        effect: { type: 'addPower', amount: 5 },
      },
    ],
  }),
]);

function stacks(state: GameState, player: PlayerIndex, defId: string): number {
  return state.cards[uidOf(state, player, defId)]?.statuses.high ?? 0;
}

function issuesOf(cards: CardInput[]): readonly string[] {
  try {
    catalogWith(cards);
  } catch (error) {
    expect(error).toBeInstanceOf(CatalogError);
    return (error as CatalogError).issues;
  }
  throw new Error('expected a CatalogError');
}

describe('filter withoutStatus', () => {
  it.each(['a', 'b', 'c', 'd', 'e', 'f'])('a random target skips the cards that have the status (seed %s)', (seed) => {
    let state = newGame(catalog, { p0: ['stoned', 'dealer'], p1: ['v1'], seed });
    state = playTurn(catalog, state, { p0: [['stoned', 0]], p1: [['v1', 0]] }).state;
    state = playTurn(catalog, state, { p0: [['dealer', 0]] }).state;
    expect(stacks(state, 1, 'v1')).toBe(1);
    expect(stacks(state, 0, 'stoned')).toBe(1);
    expect(stacks(state, 0, 'dealer')).toBe(0);
  });

  it('picks nothing when every other card already has the status', () => {
    let state = newGame(catalog, { p0: ['stoned', 'dealer'] });
    state = playTurn(catalog, state, { p0: [['stoned', 0]] }).state;
    state = playTurn(catalog, state, { p0: [['dealer', 0]] }).state;
    expect(stacks(state, 0, 'stoned')).toBe(1);
    expect(stacks(state, 0, 'dealer')).toBe(0);
  });

  it('counts only the cards without the status (ongoing and conditions)', () => {
    let state = newGame(catalog, { p0: ['stoned', 'sober-fan', 'sober-counter'], p1: ['v1'] });
    state = playTurn(catalog, state, { p0: [['stoned', 0]], p1: [['v1', 0]] }).state;
    state = playTurn(catalog, state, { p0: [['sober-fan', 0]] }).state;
    expect(powerAt(catalog, state, 0, 'sober-fan')).toBe(1);
    state = playTurn(catalog, state, { p0: [['sober-counter', 0]] }).state;
    // v1 and sober-fan are sober: the condition holds; sober-fan now sees sober-counter too.
    expect(powerAt(catalog, state, 0, 'sober-counter')).toBe(6);
    expect(powerAt(catalog, state, 0, 'sober-fan')).toBe(2);
  });

  it('reads « non défoncée » in the text', () => {
    expect(describeCard(catalog, catalog.card('dealer'))).toEqual([
      'À la révélation : rend une autre carte non défoncée ici au hasard défoncée.',
    ]);
    expect(describeCard(catalog, catalog.card('sober-fan'))).toEqual([
      'En continu : +1 puissance par autre carte non défoncée ici.',
    ]);
  });

  it('refuses a filter that requires and excludes the same status', () => {
    const issues = issuesOf([
      card('contradiction', {
        abilities: [
          {
            trigger: 'onReveal',
            target: { type: 'cards', status: 'high', withoutStatus: 'high' },
            effect: { type: 'addPower', amount: 1 },
          },
        ],
      }),
    ]);
    expect(issues.some((issue) => issue.includes('"status" and "withoutStatus" must differ'))).toBe(true);
  });
});
