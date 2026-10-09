import { describe, expect, it } from 'vitest';
import {
  type Catalog,
  type GameAction,
  type GameState,
  IllegalActionError,
  MAX_HAND,
  STATUSES,
  Rng,
  applyAction,
  checkInvariants,
  createGame,
  openLocations,
  playableCards,
  projectEventsForPlayer,
  projectForPlayer,
} from '../src/index.ts';
import { playRandomTurn } from '../src/sim/bot.ts';
import { act, card, catalogWith, deckOf, newGame, playTurn, powerAt, skipToTurn, uidOf } from './support.ts';

const BENJ = 'character:benj';

const catalog = catalogWith(
  [
    card('v1'),
    card('v2'),
    card('v3'),
    card('v4'),
    card('benj', { tags: [BENJ] }),
    card('giant', { power: 5 }),
    // move
    card('slider', { abilities: [{ trigger: 'onReveal', effect: { type: 'move', destination: 'right' } }] }),
    card('lefty', { abilities: [{ trigger: 'onReveal', effect: { type: 'move', destination: 'left' } }] }),
    card('wanderer', { abilities: [{ trigger: 'onReveal', effect: { type: 'move' } }] }),
    card('booster', {
      abilities: [{ trigger: 'ongoing', target: { type: 'cards' }, effect: { type: 'addPower', amount: 1 } }],
    }),
    card('greeter', {
      abilities: [
        { trigger: 'onReveal', effect: { type: 'addPower', amount: 3 } },
        { trigger: 'endOfTurn', effect: { type: 'move', destination: 'right' } },
      ],
    }),
    card('pusher', {
      abilities: [
        {
          trigger: 'onReveal',
          target: { type: 'cards', side: 'enemy' },
          effect: { type: 'move', destination: 'right' },
        },
      ],
    }),
    // onCardPlayedHere
    card('benj-watcher', {
      abilities: [
        {
          trigger: 'onCardPlayedHere',
          played: { side: 'ally', tag: BENJ },
          effect: { type: 'addPower', amount: 2 },
        },
      ],
    }),
    card('sentinel', {
      abilities: [{ trigger: 'onCardPlayedHere', effect: { type: 'addPower', amount: 1 } }],
    }),
    // onDestroyed
    card('martyr', {
      abilities: [
        {
          trigger: 'onDestroyed',
          target: { type: 'cards', side: 'enemy', pick: 'strongest' },
          effect: { type: 'addPower', amount: -3 },
        },
      ],
    }),
    card('phoenix', { abilities: [{ trigger: 'onDestroyed', effect: { type: 'addToHand' } }] }),
    card('rock', {
      statuses: ['tough'],
      abilities: [{ trigger: 'onDestroyed', effect: { type: 'draw' } }],
    }),
    card('assassin', {
      abilities: [
        { trigger: 'onReveal', target: { type: 'cards', side: 'enemy', pick: 'weakest' }, effect: { type: 'destroy' } },
      ],
    }),
    card('saboteur', {
      abilities: [
        {
          trigger: 'onReveal',
          target: { type: 'cards', side: 'enemy', pick: 'weakest' },
          effect: { type: 'addPower', amount: -3 },
        },
      ],
    }),
    card('hater', {
      abilities: [
        { trigger: 'ongoing', target: { type: 'cards', side: 'enemy' }, effect: { type: 'addPower', amount: -1 } },
      ],
    }),
    // costs
    card('big', { cost: 3 }),
    card('big2', { cost: 3 }),
    card('benj-big', { cost: 3, tags: [BENJ] }),
    card('discounter', { abilities: [{ trigger: 'onReveal', effect: { type: 'addCost', amount: -1 } }] }),
    card('deep-discounter', { abilities: [{ trigger: 'onReveal', effect: { type: 'addCost', amount: -9 } }] }),
    card('taxer', { abilities: [{ trigger: 'onReveal', effect: { type: 'addCost', amount: 1 } }] }),
    card('benj-discounter', {
      abilities: [{ trigger: 'onReveal', effect: { type: 'addCost', amount: -2, tag: BENJ } }],
    }),
    card('prep', {
      abilities: [{ trigger: 'onReveal', effect: { type: 'addCost', amount: -2, cards: 'next' } }],
    }),
    // hand
    card('copier', { abilities: [{ trigger: 'onReveal', effect: { type: 'addToHand', count: 2 } }] }),
    card('gifter', { abilities: [{ trigger: 'onReveal', effect: { type: 'addToHand', card: 'giant' } }] }),
    // statuses
    card('drinker', { power: 5, statuses: ['drunk'] }),
    card('tough-drinker', { power: 5, statuses: ['tough', 'drunk'] }),
    card('double-drinker', {
      power: 5,
      abilities: [{ trigger: 'onReveal', effect: { type: 'addStatus', status: 'drunk', stacks: 2 } }],
    }),
    card('shield', { power: 5, statuses: ['protected'] }),
    card('tough-shield', { power: 5, statuses: ['tough', 'protected'] }),
    card('boiler', {
      statuses: ['overheat'],
      abilities: [{ trigger: 'endOfTurn', effect: { type: 'addStatus', status: 'overheat' } }],
    }),
    card('tough-boiler', {
      statuses: ['tough', 'overheat'],
      abilities: [{ trigger: 'endOfTurn', effect: { type: 'addStatus', status: 'overheat' } }],
    }),
    card('furnace', {
      abilities: [{ trigger: 'onReveal', effect: { type: 'addStatus', status: 'overheat', stacks: 3 } }],
    }),
    card('shield-furnace', {
      statuses: ['protected'],
      abilities: [{ trigger: 'onReveal', effect: { type: 'addStatus', status: 'overheat', stacks: 3 } }],
    }),
  ],
  [
    {
      id: 'loc-watch',
      name: 'Surveillance',
      abilities: [
        {
          trigger: 'onCardPlayedHere',
          target: { type: 'cards', side: 'all' },
          effect: { type: 'addPower', amount: 1 },
        },
      ],
    },
    {
      id: 'loc-tax',
      name: 'Taxe',
      abilities: [{ trigger: 'onReveal', effect: { type: 'addCost', amount: -1 } }],
    },
    { id: 'loc-tight', name: 'Étroit', rules: { capacity: 2 } },
    { id: 'loc-closing', name: 'Fermeture', rules: { closedFromTurn: 3 } },
    { id: 'loc-late', name: 'Tardif', rules: { openFromTurn: 4 } },
  ],
);

function expectIllegal(run: () => unknown, code: string): void {
  expect(run).toThrow(IllegalActionError);
  try {
    run();
  } catch (error) {
    expect((error as IllegalActionError).code).toBe(code);
  }
}

function play(state: GameState, player: 0 | 1, defId: string, location: number): GameAction {
  return { type: 'play', player, card: uidOf(state, player, defId), location };
}

function locationOf(state: GameState, player: 0 | 1, defId: string): number | null {
  return state.cards[uidOf(state, player, defId)]?.location ?? null;
}

function zoneOf(state: GameState, player: 0 | 1, defId: string): string | undefined {
  return state.cards[uidOf(state, player, defId)]?.zone;
}

function handCost(state: GameState, c: Catalog, player: 0 | 1, defId: string): number | undefined {
  return projectForPlayer(c, state, player).hand.find((view) => view.defId === defId)?.cost;
}

describe('move', () => {
  it('moves to the adjacent location, and stays put when there is none', () => {
    const state = newGame(catalog, { p0: ['slider', 'lefty'] });
    const { state: next, events } = playTurn(catalog, state, {
      p0: [
        ['slider', 0],
        ['lefty', 0],
      ],
    });
    expect(locationOf(next, 0, 'slider')).toBe(1);
    expect(events).toContainEqual({ type: 'cardMoved', card: uidOf(next, 0, 'slider'), from: 0, to: 1 });
    // nothing on the left of location 0
    expect(locationOf(next, 0, 'lefty')).toBe(0);
    expect(next.locations[1]?.cards[0]).toEqual([uidOf(next, 0, 'slider')]);
  });

  it('moves randomly to another location of its side, deterministically for a seed', () => {
    const run = (seed: string): number | null =>
      locationOf(
        playTurn(catalog, newGame(catalog, { p0: ['wanderer'], seed }), { p0: [['wanderer', 0]] }).state,
        0,
        'wanderer',
      );
    const destinations = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(run));
    expect(destinations).toEqual(new Set([1, 2]));
    expect(run('a')).toBe(run('a'));
  });

  it('does nothing when the other locations have no free place, pending plays included', () => {
    const state = newGame(catalog, { p0: ['slider', 'v1', 'v2', 'v3', 'v4'] });
    // The slider is revealed first: the four plays waiting at location 1 already hold their places.
    const next = playTurn(catalog, state, {
      p0: [
        ['slider', 0],
        ['v1', 1],
        ['v2', 1],
        ['v3', 1],
        ['v4', 1],
      ],
    }).state;
    expect(locationOf(next, 0, 'slider')).toBe(0);
  });

  it('keeps ongoing bonuses with the location and does not fire onReveal again', () => {
    const state = newGame(catalog, { p0: ['booster', 'greeter'] });
    const turn1 = playTurn(catalog, state, {
      p0: [
        ['booster', 1],
        ['greeter', 0],
      ],
    }).state;
    // greeter: 1 + 3 (onReveal), moved by its end of turn ability next to the booster
    expect(locationOf(turn1, 0, 'greeter')).toBe(1);
    expect(powerAt(catalog, turn1, 0, 'greeter')).toBe(1 + 3 + 1);
    const turn2 = playTurn(catalog, turn1).state;
    expect(locationOf(turn2, 0, 'greeter')).toBe(2);
    expect(powerAt(catalog, turn2, 0, 'greeter')).toBe(1 + 3);
  });

  it('moves enemy cards to a place of their own side', () => {
    const state = newGame(catalog, { p0: ['pusher'], p1: ['v1'] });
    const next = playTurn(catalog, playTurn(catalog, state, { p1: [['v1', 0]] }).state, { p0: [['pusher', 0]] }).state;
    expect(locationOf(next, 1, 'v1')).toBe(1);
    expect(next.locations[1]?.cards[1]).toEqual([uidOf(next, 1, 'v1')]);
  });
});

describe('onCardPlayedHere', () => {
  it('fires for cards played after it, here, matching the filter', () => {
    const state = newGame(catalog, { p0: ['benj-watcher', 'benj', 'v1'], p1: ['benj'] });
    const next = playTurn(catalog, state, {
      p0: [
        ['benj-watcher', 0],
        ['v1', 0],
        ['benj', 0],
      ],
      p1: [['benj', 0]],
    }).state;
    // one ally Benj played here (the enemy Benj and the plain card do not count)
    expect(powerAt(catalog, next, 0, 'benj-watcher')).toBe(1 + 2);
  });

  it('ignores cards played earlier, elsewhere, and itself', () => {
    const state = newGame(catalog, { p0: ['benj', 'benj-watcher', 'v1'] });
    const next = playTurn(catalog, state, {
      p0: [
        ['benj', 0],
        ['benj-watcher', 0],
        ['v1', 1],
      ],
    }).state;
    expect(powerAt(catalog, next, 0, 'benj-watcher')).toBe(1);
  });

  it('defaults to any other card, enemies included, on later turns', () => {
    const state = newGame(catalog, { p0: ['sentinel'], p1: ['v1', 'v2'] });
    const turn1 = playTurn(catalog, state, { p0: [['sentinel', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p1: [['v1', 0]] }).state;
    expect(powerAt(catalog, turn2, 0, 'sentinel')).toBe(2);
    const turn3 = playTurn(catalog, turn2, { p1: [['v2', 1]] }).state;
    expect(powerAt(catalog, turn3, 0, 'sentinel')).toBe(2);
  });

  it('triggers a terrain too, after the card own reveal ability', () => {
    const state = newGame(catalog, { p0: ['greeter', 'v1'], locations: ['loc-watch', 'loc-b', 'loc-c'] });
    const next = playTurn(catalog, state, {
      p0: [
        ['v1', 0],
        ['greeter', 0],
      ],
    }).state;
    // v1: +1 when it is played, +1 when the greeter is played. greeter: +3 own onReveal, then +1 from the terrain.
    expect(powerAt(catalog, next, 0, 'v1')).toBe(1 + 1 + 1);
    expect(powerAt(catalog, next, 0, 'greeter')).toBe(1 + 3 + 1);
  });
});

describe('onDestroyed', () => {
  it('applies its effect relative to the location where the card was', () => {
    const state = newGame(catalog, { p0: ['martyr'], p1: ['giant', 'assassin'] });
    const turn1 = playTurn(catalog, state, { p0: [['martyr', 0]], p1: [['giant', 0]] }).state;
    const { state: turn2, events } = playTurn(catalog, turn1, { p1: [['assassin', 0]] });
    expect(zoneOf(turn2, 0, 'martyr')).toBe('destroyed');
    expect(events).toContainEqual({ type: 'cardDestroyed', card: uidOf(turn2, 0, 'martyr') });
    expect(powerAt(catalog, turn2, 1, 'giant')).toBe(5 - 3);
  });

  it('can add a copy of the destroyed card to its owner hand', () => {
    const state = newGame(catalog, { p0: ['phoenix'], p1: ['assassin'] });
    const turn1 = playTurn(catalog, state, { p0: [['phoenix', 0]] }).state;
    const handBefore = turn1.players[0].hand.length;
    const turn2 = playTurn(catalog, turn1, { p1: [['assassin', 0]] });
    const copies = turn2.state.players[0].hand.filter((uid) => turn2.state.cards[uid]?.defId === 'phoenix');
    expect(copies).toHaveLength(1);
    // +1 turn draw, +1 copy
    expect(turn2.state.players[0].hand).toHaveLength(handBefore + 2);
  });

  it('does not fire when the card survives (Coriace, Protection)', () => {
    const state = newGame(catalog, { p0: ['rock'], p1: ['assassin'] });
    const turn1 = playTurn(catalog, state, { p0: [['rock', 0]] }).state;
    const handBefore = turn1.players[0].hand.length;
    const turn2 = playTurn(catalog, turn1, { p1: [['assassin', 0]] }).state;
    expect(zoneOf(turn2, 0, 'rock')).toBe('board');
    expect(turn2.players[0].hand).toHaveLength(handBefore + 1);
  });
});

describe('addCost', () => {
  it('lowers the cost of the whole hand, everywhere the effective cost is read', () => {
    const state = newGame(catalog, { p0: ['discounter', 'big'], p1: ['big'] });
    const turn2 = playTurn(catalog, state, { p0: [['discounter', 0]] }).state;
    expect(handCost(turn2, catalog, 0, 'big')).toBe(2);
    expect(handCost(turn2, catalog, 1, 'big')).toBe(3);
    // 2 energy at turn 2: only the discounted card is playable
    expect(playableCards(catalog, turn2, 0)).toContain(uidOf(turn2, 0, 'big'));
    expect(playableCards(catalog, turn2, 1)).not.toContain(uidOf(turn2, 1, 'big'));
    const played = act(catalog, turn2, play(turn2, 0, 'big', 0)).state;
    expect(played.players[0].spent).toBe(2);
    const cancelled = act(catalog, played, { type: 'cancel', player: 0, card: uidOf(played, 0, 'big') }).state;
    expect(cancelled.players[0].spent).toBe(0);
  });

  it('refuses a card that is too expensive once costs are raised', () => {
    const state = newGame(catalog, { p0: ['taxer', 'v1'] });
    const turn2 = playTurn(catalog, state, { p0: [['taxer', 0]] }).state;
    expect(handCost(turn2, catalog, 0, 'v1')).toBe(2);
    turn2.players[0].energy = 1;
    expectIllegal(() => applyAction(catalog, turn2, play(turn2, 0, 'v1', 0)), 'notEnoughEnergy');
  });

  it('never goes below 0 and a later raise starts from the floor', () => {
    const state = newGame(catalog, { p0: ['deep-discounter', 'taxer', 'v1'] });
    const turn2 = playTurn(catalog, state, { p0: [['deep-discounter', 0]] }).state;
    expect(handCost(turn2, catalog, 0, 'v1')).toBe(0);
    const turn3 = playTurn(catalog, turn2, { p0: [['taxer', 0]] }).state;
    expect(handCost(turn3, catalog, 0, 'v1')).toBe(1);
  });

  it('can target the cards of a tag only', () => {
    const state = newGame(catalog, { p0: ['benj-discounter', 'benj-big', 'big'] });
    const turn2 = playTurn(catalog, state, { p0: [['benj-discounter', 0]] }).state;
    expect(handCost(turn2, catalog, 0, 'benj-big')).toBe(1);
    expect(handCost(turn2, catalog, 0, 'big')).toBe(3);
  });

  it('discounts the next card played only, and gives it back on cancel', () => {
    const state = newGame(catalog, { p0: ['prep', 'big', 'big2'] });
    const turn2 = playTurn(catalog, state, { p0: [['prep', 0]] }).state;
    expect(handCost(turn2, catalog, 0, 'big')).toBe(1);
    expect(handCost(turn2, catalog, 0, 'big2')).toBe(1);
    const played = act(catalog, turn2, play(turn2, 0, 'big', 0)).state;
    expect(played.players[0].spent).toBe(1);
    expect(handCost(played, catalog, 0, 'big2')).toBe(3);
    const cancelled = act(catalog, played, { type: 'cancel', player: 0, card: uidOf(played, 0, 'big') }).state;
    expect(cancelled.players[0].spent).toBe(0);
    expect(handCost(cancelled, catalog, 0, 'big2')).toBe(1);
  });

  it('applies to both players from a terrain', () => {
    const state = newGame(catalog, { p0: ['big'], p1: ['big'], locations: ['loc-a', 'loc-tax', 'loc-c'] });
    const turn2 = skipToTurn(catalog, state, 2, 2);
    expect(handCost(turn2, catalog, 0, 'big')).toBe(2);
    expect(handCost(turn2, catalog, 1, 'big')).toBe(2);
  });

  it('is never revealed to the opponent', () => {
    const state = newGame(catalog, { p0: ['discounter'] });
    const { events } = playTurn(catalog, state, { p0: [['discounter', 0]] });
    expect(events.some((event) => event.type === 'costChanged' && event.player === 0)).toBe(true);
    expect(projectEventsForPlayer(events, 0).some((event) => event.type === 'costChanged')).toBe(true);
    expect(projectEventsForPlayer(events, 1).some((event) => event.type === 'costChanged')).toBe(false);
  });
});

describe('addToHand', () => {
  it('adds copies of the card carrying the ability, respecting the hand limit', () => {
    const state = newGame(catalog, { p0: ['copier'] });
    const { state: next, events } = playTurn(catalog, state, { p0: [['copier', 0]] });
    const copies = next.players[0].hand.filter((uid) => next.cards[uid]?.defId === 'copier');
    expect(copies).toHaveLength(2);
    expect(events.filter((event) => event.type === 'cardAddedToHand')).toHaveLength(2);

    const crowded = newGame(catalog, { p0: ['copier', 'v1', 'v2', 'v3', 'v4', 'benj', 'giant'] });
    const capped = playTurn(catalog, crowded, { p0: [['copier', 0]] }).state;
    expect(capped.players[0].hand.length).toBe(Math.max(MAX_HAND, crowded.players[0].hand.length - 1));
  });

  it('adds a catalog card by id, as a fresh instance that checks the invariants', () => {
    const state = newGame(catalog, { p0: ['gifter'] });
    const next = playTurn(catalog, state, { p0: [['gifter', 0]] }).state;
    const gifts = next.players[0].hand.filter((uid) => next.cards[uid]?.defId === 'giant');
    expect(gifts).toHaveLength(1);
    expect(new Set(Object.keys(next.cards)).size).toBe(Object.keys(next.cards).length);
    expect(next.cards[gifts[0] ?? '']).toMatchObject({ zone: 'hand', owner: 0, costModifier: 0 });
  });

  it('only tells the opponent that the hand grew', () => {
    const state = newGame(catalog, { p0: ['gifter'] });
    const { state: next, events } = playTurn(catalog, state, { p0: [['gifter', 0]] });
    const added = projectEventsForPlayer(events, 1).find((event) => event.type === 'cardAddedToHand');
    expect(added).toEqual({ type: 'cardAddedToHand', player: 0, card: null, defId: null });
    const own = projectEventsForPlayer(events, 0).find((event) => event.type === 'cardAddedToHand');
    expect(own).toMatchObject({ player: 0, defId: 'giant' });
    expect(projectForPlayer(catalog, next, 1).opponent.handCount).toBe(next.players[0].hand.length);
  });
});

describe('location rules', () => {
  const tight = ['loc-tight', 'loc-closing', 'loc-late'];

  it('caps the places of a location below the usual four', () => {
    const state = newGame(catalog, { p0: ['v1', 'v2', 'v3'], locations: tight });
    const two = act(catalog, state, play(state, 0, 'v1', 0), play(state, 0, 'v2', 0)).state;
    expectIllegal(() => applyAction(catalog, two, play(state, 0, 'v3', 0)), 'locationFull');
    expect(openLocations(catalog, two, 0)).not.toContain(0);
    expect(openLocations(catalog, two, 1)).toContain(1);
  });

  it('closes a location from a turn on, and opens one at a turn', () => {
    const state = skipToTurn(catalog, newGame(catalog, { p0: ['v1'], locations: tight }), 3);
    expect(openLocations(catalog, state, 0)).toEqual([0]);
    expectIllegal(() => applyAction(catalog, state, play(state, 0, 'v1', 1)), 'locationClosed');
    expectIllegal(() => applyAction(catalog, state, play(state, 0, 'v1', 2)), 'locationClosed');
    const turn4 = skipToTurn(catalog, state, 4);
    expect(openLocations(catalog, turn4, 0)).toEqual([0, 2]);
    expect(() => applyAction(catalog, turn4, play(turn4, 0, 'v1', 2))).not.toThrow();
  });

  it('only applies once the location is revealed', () => {
    const state = newGame(catalog, { p0: ['v1'], locations: tight });
    expect(openLocations(catalog, state, 0)).toEqual([0, 1, 2]);
    expect(() => applyAction(catalog, state, play(state, 0, 'v1', 2))).not.toThrow();
  });
});

describe('statuses: Ivresse', () => {
  it('adds or removes 2 power per stack at the end of every turn, deterministically', () => {
    const states = ['a', 'b', 'c', 'd', 'e', 'f'].map(
      (seed) => playTurn(catalog, newGame(catalog, { p0: ['drinker'], seed }), { p0: [['drinker', 0]] }).state,
    );
    const powers = states.map((state) => powerAt(catalog, state, 0, 'drinker'));
    expect(powers.every((power) => power === 7 || power === 3)).toBe(true);
    expect(new Set(powers).size).toBe(2);
    const again = playTurn(catalog, newGame(catalog, { p0: ['drinker'], seed: 'a' }), { p0: [['drinker', 0]] }).state;
    expect(powerAt(catalog, again, 0, 'drinker')).toBe(powers[0]);
  });

  it('rolls once per stack', () => {
    const powers = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((seed) =>
      powerAt(
        catalog,
        playTurn(catalog, newGame(catalog, { p0: ['double-drinker'], seed }), { p0: [['double-drinker', 0]] }).state,
        0,
        'double-drinker',
      ),
    );
    expect(powers.every((power) => [1, 5, 9].includes(power))).toBe(true);
    expect(new Set(powers).size).toBeGreaterThan(1);
  });

  it('cannot hurt a Coriace card', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const next = playTurn(catalog, newGame(catalog, { p0: ['tough-drinker'], seed }), {
        p0: [['tough-drinker', 0]],
      }).state;
      expect(powerAt(catalog, next, 0, 'tough-drinker')).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('statuses: Protection', () => {
  it('cancels the next destruction, then disappears', () => {
    const state = newGame(catalog, { p0: ['shield'], p1: ['assassin'] });
    const turn1 = playTurn(catalog, state, { p0: [['shield', 0]] }).state;
    const { state: turn2, events } = playTurn(catalog, turn1, { p1: [['assassin', 0]] });
    expect(zoneOf(turn2, 0, 'shield')).toBe('board');
    expect(turn2.cards[uidOf(turn2, 0, 'shield')]?.statuses).toEqual({});
    expect(events).toContainEqual({
      type: 'statusChanged',
      card: uidOf(turn2, 0, 'shield'),
      status: 'protected',
      stacks: 0,
    });
  });

  it('cancels the next power loss, then disappears', () => {
    const state = newGame(catalog, { p0: ['shield'], p1: ['saboteur', 'v1'] });
    const turn1 = playTurn(catalog, state, { p0: [['shield', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p1: [['saboteur', 0]] }).state;
    expect(powerAt(catalog, turn2, 0, 'shield')).toBe(5);
    expect(turn2.cards[uidOf(turn2, 0, 'shield')]?.statuses).toEqual({});
  });

  it('is not spent by Coriace, which already prevents the loss', () => {
    const state = newGame(catalog, { p0: ['tough-shield'], p1: ['assassin'] });
    const turn1 = playTurn(catalog, state, { p0: [['tough-shield', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p1: [['assassin', 0]] }).state;
    expect(zoneOf(turn2, 0, 'tough-shield')).toBe('board');
    expect(turn2.cards[uidOf(turn2, 0, 'tough-shield')]?.statuses).toEqual({ tough: 1, protected: 1 });
  });

  it('does not absorb continuous maluses, which are not events', () => {
    const state = newGame(catalog, { p0: ['shield'], p1: ['hater'] });
    const next = playTurn(catalog, state, { p0: [['shield', 0]], p1: [['hater', 0]] }).state;
    expect(powerAt(catalog, next, 0, 'shield')).toBe(4);
    expect(next.cards[uidOf(next, 0, 'shield')]?.statuses).toEqual({ protected: 1 });
  });
});

describe('statuses: Surchauffe', () => {
  it('destroys the card as soon as it reaches 3 stacks', () => {
    const state = newGame(catalog, { p0: ['furnace'] });
    const next = playTurn(catalog, state, { p0: [['furnace', 0]] }).state;
    expect(zoneOf(next, 0, 'furnace')).toBe('destroyed');
  });

  it('counts up through the turns', () => {
    const state = newGame(catalog, { p0: ['boiler'] });
    const turn1 = playTurn(catalog, state, { p0: [['boiler', 0]] }).state;
    expect(turn1.cards[uidOf(turn1, 0, 'boiler')]?.statuses.overheat).toBe(2);
    const turn2 = playTurn(catalog, turn1).state;
    expect(zoneOf(turn2, 0, 'boiler')).toBe('destroyed');
  });

  it('is held back by Coriace, which keeps the stacks growing', () => {
    const state = newGame(catalog, { p0: ['tough-boiler'] });
    const turn3 = skipToTurn(catalog, playTurn(catalog, state, { p0: [['tough-boiler', 0]] }).state, 4);
    expect(zoneOf(turn3, 0, 'tough-boiler')).toBe('board');
    expect(turn3.cards[uidOf(turn3, 0, 'tough-boiler')]?.statuses.overheat).toBeGreaterThanOrEqual(3);
  });

  it('is delayed by one Protection, then the card is destroyed at the end of the turn', () => {
    const state = newGame(catalog, { p0: ['shield-furnace'] });
    const turn1 = playTurn(catalog, state, { p0: [['shield-furnace', 0]] }).state;
    // The reveal-time destruction was absorbed, and the end-of-turn check found no shield left.
    expect(zoneOf(turn1, 0, 'shield-furnace')).toBe('destroyed');
  });
});

describe('status registry', () => {
  it('leaves Folie without a rule of its own, so one can be added as a plain entry later', () => {
    expect(Object.keys(STATUSES.mad)).toEqual(['name', 'adjective']);
  });
});

describe('random bots on the building blocks', () => {
  const pool = [...catalog.cards.keys()].filter((id) => !id.startsWith('filler'));

  it('finish games with the effective costs and keep the invariants', () => {
    for (let game = 0; game < 40; game++) {
      const rng = new Rng({ s: game + 1 });
      const decks = [0, 1].map(() => deckOf(rng.shuffle([...pool]).slice(0, 8), catalog));
      let state = createGame(catalog, {
        seed: `bricks-${game}`,
        players: [
          { id: 'alice', deck: decks[0] ?? [] },
          { id: 'bob', deck: decks[1] ?? [] },
        ],
        locations: ['loc-tight', 'loc-closing', 'loc-late'],
      }).state;
      while (state.status === 'playing') {
        state = playRandomTurn(catalog, state, 0, rng);
        state = playRandomTurn(catalog, state, 1, rng);
        expect(checkInvariants(state)).toEqual([]);
      }
      expect(state.result).not.toBeNull();
    }
  });
});
