import { describe, expect, it } from 'vitest';
import { MAX_HAND } from '../src/index.ts';
import { card, catalogWith, moveToHand, newGame, playTurn, powerAt, skipToTurn, uidOf } from './support.ts';

const catalog = catalogWith(
  [
    card('benj', { tags: ['character:benj'] }),
    card('v1'),
    card('v2'),
    card('benj-fan', {
      abilities: [
        {
          trigger: 'onReveal',
          condition: { type: 'count', tag: 'character:benj' },
          effect: { type: 'addPower', amount: 3 },
        },
      ],
    }),
    card('captain', {
      abilities: [{ trigger: 'ongoing', target: { type: 'cards' }, effect: { type: 'addPower', amount: 1 } }],
    }),
    card('linette-fan', {
      abilities: [
        {
          trigger: 'ongoing',
          effect: { type: 'addPowerPerCard', amount: 2, count: { scope: 'everywhere', tag: 'family:linette' } },
        },
      ],
    }),
    card('babou', { tags: ['family:linette'] }),
    card('bibou', { tags: ['family:linette'] }),
    card('assassin', {
      abilities: [
        { trigger: 'onReveal', target: { type: 'cards', side: 'enemy', pick: 'weakest' }, effect: { type: 'destroy' } },
      ],
    }),
    card('scholar', { abilities: [{ trigger: 'onReveal', effect: { type: 'draw', count: 2 } }] }),
    card('grower', { abilities: [{ trigger: 'endOfTurn', effect: { type: 'addPower', amount: 1 } }] }),
    card('late-bloomer', {
      abilities: [
        { trigger: 'onReveal', condition: { type: 'turn', min: 4 }, effect: { type: 'addPower', amount: 4 } },
      ],
    }),
    card('kamikaze', {
      abilities: [
        { trigger: 'onReveal', effect: { type: 'destroy' } },
        { trigger: 'onReveal', effect: { type: 'draw' } },
      ],
    }),
  ],
  [
    {
      id: 'loc-benj',
      name: 'Chez Benj',
      abilities: [
        {
          trigger: 'ongoing',
          target: { type: 'cards', side: 'all', tag: 'character:benj' },
          effect: { type: 'addPower', amount: 2 },
        },
      ],
    },
    { id: 'loc-library', name: 'Bibliothèque', abilities: [{ trigger: 'onReveal', effect: { type: 'draw' } }] },
  ],
);

describe('on reveal', () => {
  it('applies when its condition holds at reveal time, so play order matters', () => {
    const ordered = playTurn(catalog, newGame(catalog, { p0: ['benj', 'benj-fan'] }), {
      p0: [
        ['benj', 0],
        ['benj-fan', 0],
      ],
    }).state;
    expect(powerAt(catalog, ordered, 0, 'benj-fan')).toBe(4);

    const reversed = playTurn(catalog, newGame(catalog, { p0: ['benj', 'benj-fan'] }), {
      p0: [
        ['benj-fan', 0],
        ['benj', 0],
      ],
    }).state;
    expect(powerAt(catalog, reversed, 0, 'benj-fan')).toBe(1);
  });

  it('only sees cards of its own side and location', () => {
    const state = newGame(catalog, { p0: ['benj-fan'], p1: ['benj'] });
    const next = playTurn(catalog, state, { p1: [['benj', 0]], p0: [['benj-fan', 0]] }).state;
    expect(powerAt(catalog, next, 0, 'benj-fan')).toBe(1);
  });

  it('destroys the weakest enemy here', () => {
    const state = newGame(catalog, { p0: ['v1', 'captain'], p1: ['assassin'] });
    const turn2 = playTurn(catalog, state, {
      p0: [
        ['v1', 0],
        ['captain', 0],
      ],
    }).state;
    expect(powerAt(catalog, turn2, 0, 'v1')).toBe(2);
    turn2.players[1].energy = 10;

    const { state: next, events } = playTurn(catalog, turn2, { p1: [['assassin', 0]] });
    const captain = uidOf(next, 0, 'captain');
    expect(events).toContainEqual({ type: 'cardDestroyed', card: captain });
    expect(next.cards[captain]?.zone).toBe('destroyed');
    expect(next.locations[0]?.cards[0]).toEqual([uidOf(next, 0, 'v1')]);
    expect(powerAt(catalog, next, 0, 'v1')).toBe(1);
  });

  it('draws cards without going over the hand limit', () => {
    const state = newGame(catalog, { p0: ['scholar'] });
    const before = state.players[0].hand.length;
    const next = playTurn(catalog, state, { p0: [['scholar', 0]] }).state;
    // -1 played, +1 turn draw, +2 scholar
    expect(next.players[0].hand).toHaveLength(before + 2);

    const crowded = newGame(catalog, { p0: ['scholar', 'v1', 'v2', 'benj', 'babou', 'bibou', 'grower'] });
    expect(crowded.players[0].hand.length).toBeGreaterThanOrEqual(MAX_HAND);
    const capped = playTurn(catalog, crowded, { p0: [['scholar', 0]] }).state;
    expect(capped.players[0].hand.length).toBe(Math.max(MAX_HAND, crowded.players[0].hand.length - 1));
  });

  it('checks the turn condition', () => {
    const early = playTurn(catalog, skipToTurn(catalog, newGame(catalog, { p0: ['late-bloomer'] }), 3), {
      p0: [['late-bloomer', 0]],
    }).state;
    expect(powerAt(catalog, early, 0, 'late-bloomer')).toBe(1);

    const late = playTurn(catalog, skipToTurn(catalog, newGame(catalog, { p0: ['late-bloomer'] }), 4), {
      p0: [['late-bloomer', 0]],
    }).state;
    expect(powerAt(catalog, late, 0, 'late-bloomer')).toBe(5);
  });

  it('stops the remaining abilities of a card that destroyed itself', () => {
    const state = newGame(catalog, { p0: ['kamikaze'] });
    const before = state.players[0].hand.length;
    const { state: next, events } = playTurn(catalog, state, { p0: [['kamikaze', 0]] });
    expect(next.cards[uidOf(next, 0, 'kamikaze')]?.zone).toBe('destroyed');
    expect(events.filter((event) => event.type === 'cardDrawn' && event.player === 0)).toHaveLength(1);
    expect(next.players[0].hand).toHaveLength(before);
  });
});

describe('ongoing', () => {
  it('buffs the other allies here while the source stays on the board', () => {
    const state = newGame(catalog, { p0: ['captain', 'v1', 'v2'], p1: ['benj'] });
    const next = playTurn(catalog, state, {
      p0: [
        ['captain', 0],
        ['v1', 0],
        ['v2', 1],
      ],
      p1: [['benj', 0]],
    }).state;

    expect(powerAt(catalog, next, 0, 'v1')).toBe(2);
    expect(powerAt(catalog, next, 0, 'captain')).toBe(1);
    expect(powerAt(catalog, next, 0, 'v2')).toBe(1);
    expect(powerAt(catalog, next, 1, 'benj')).toBe(1);
  });

  it('counts tagged cards everywhere, live', () => {
    const state = newGame(catalog, { p0: ['linette-fan', 'babou', 'bibou'], p1: ['assassin'] });
    const turn2 = playTurn(catalog, state, {
      p0: [
        ['linette-fan', 0],
        ['babou', 1],
        ['bibou', 2],
      ],
    }).state;
    expect(powerAt(catalog, turn2, 0, 'linette-fan')).toBe(5);

    turn2.players[1].energy = 10;
    const turn3 = playTurn(catalog, turn2, { p1: [['assassin', 1]] }).state;
    expect(powerAt(catalog, turn3, 0, 'linette-fan')).toBe(3);
  });
});

describe('end of turn', () => {
  it('grows every turn the card stays on the board', () => {
    const state = newGame(catalog, { p0: ['grower'] });
    const turn2 = playTurn(catalog, state, { p0: [['grower', 0]] }).state;
    expect(powerAt(catalog, turn2, 0, 'grower')).toBe(2);
    const turn4 = skipToTurn(catalog, turn2, 4);
    expect(powerAt(catalog, turn4, 0, 'grower')).toBe(4);
  });
});

describe('locations', () => {
  it('buffs matching cards of both sides once revealed', () => {
    const state = newGame(catalog, { p0: ['benj', 'v1'], p1: ['benj'], locations: ['loc-a', 'loc-b', 'loc-benj'] });
    const turn2 = playTurn(catalog, state, {
      p0: [
        ['benj', 2],
        ['v1', 2],
      ],
      p1: [['benj', 2]],
    }).state;
    expect(powerAt(catalog, turn2, 0, 'benj')).toBe(1);

    const turn3 = skipToTurn(catalog, turn2, 3);
    expect(turn3.locations[2]?.revealed).toBe(true);
    expect(powerAt(catalog, turn3, 0, 'benj')).toBe(3);
    expect(powerAt(catalog, turn3, 1, 'benj')).toBe(3);
    expect(powerAt(catalog, turn3, 0, 'v1')).toBe(1);
  });

  it('runs its reveal ability for both players', () => {
    const state = newGame(catalog, { locations: ['loc-a', 'loc-library', 'loc-b'] });
    const hands = state.players.map((player) => player.hand.length);
    const { state: turn2, events } = playTurn(catalog, state);
    expect(events).toContainEqual({ type: 'locationRevealed', location: 1 });
    expect(turn2.players.map((player) => player.hand.length)).toEqual(
      hands.map((size) => Math.min(size + 2, MAX_HAND)),
    );
  });
});

describe('test helpers', () => {
  it('moves a card from the deck to the hand once', () => {
    const state = newGame(catalog, { p0: ['v1'] });
    const uid = moveToHand(state, 0, 'v1');
    expect(state.players[0].hand.filter((id) => id === uid)).toHaveLength(1);
    expect(state.players[0].deck).not.toContain(uid);
  });
});
