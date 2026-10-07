import { describe, expect, it } from 'vitest';
import {
  GameSetupError,
  IllegalActionError,
  LOCATION_CAPACITY,
  MAX_TURNS,
  applyAction,
  createGame,
  locationPowers,
  type GameState,
  validateDeck,
} from '../src/index.ts';
import { act, card, catalogWith, deckOf, newGame, playTurn, powerAt, skipToTurn, uidOf } from './support.ts';

const catalog = catalogWith(
  [
    card('one', { cost: 1, power: 1 }),
    card('two', { cost: 2, power: 3 }),
    card('big', { cost: 1, power: 5 }),
    card('a1'),
    card('a2'),
    card('a3'),
    card('a4'),
    card('a5'),
  ],
  [
    { id: 'loc-d', name: 'loc-d' },
    { id: 'loc-e', name: 'loc-e' },
  ],
);

function expectIllegal(run: () => unknown, code: IllegalActionError['code']): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(IllegalActionError);
    expect((error as IllegalActionError).code).toBe(code);
    return;
  }
  throw new Error(`expected an IllegalActionError "${code}"`);
}

describe('setup', () => {
  it('deals 3 cards plus the turn draw, reveals the first location and gives 1 energy', () => {
    const { state, events } = createGame(catalog, {
      seed: 'setup',
      players: [
        { id: 'alice', deck: deckOf() },
        { id: 'bob', deck: deckOf() },
      ],
    });

    expect(state.turn).toBe(1);
    for (const player of state.players) {
      expect(player.hand).toHaveLength(4);
      expect(player.deck).toHaveLength(8);
      expect(player.energy).toBe(1);
    }
    expect(state.locations.map((location) => location.revealed)).toEqual([true, false, false]);
    expect(events).toContainEqual({ type: 'locationRevealed', location: 0 });
  });

  it('draws three distinct locations from the pool, or keeps exactly three given ones in order', () => {
    const drawn = createGame(catalog, {
      seed: 'pool',
      players: [
        { id: 'alice', deck: deckOf() },
        { id: 'bob', deck: deckOf() },
      ],
    }).state;
    expect(new Set(drawn.locations.map((location) => location.defId)).size).toBe(3);

    const forced = newGame(catalog, { locations: ['loc-e', 'loc-a', 'loc-d'] });
    expect(forced.locations.map((location) => location.defId)).toEqual(['loc-e', 'loc-a', 'loc-d']);
  });

  it('refuses illegal decks and players', () => {
    expect(validateDeck(catalog, deckOf().slice(0, 11))).toEqual(['a deck holds exactly 12 cards, got 11']);
    expect(validateDeck(catalog, [...deckOf().slice(0, 11), 'filler-1'])).toContain(
      'a deck holds at most one copy of each card',
    );
    expect(validateDeck(catalog, [...deckOf().slice(0, 11), 'ghost'])).toContain('unknown card ghost');

    expect(() =>
      createGame(catalog, {
        seed: 'x',
        players: [
          { id: 'same', deck: deckOf() },
          { id: 'same', deck: deckOf() },
        ],
      }),
    ).toThrow(GameSetupError);
    expect(() =>
      createGame(catalog, {
        seed: 'x',
        players: [
          { id: 'alice', deck: deckOf() },
          { id: 'bob', deck: deckOf() },
        ],
        locations: ['loc-a', 'loc-b'],
      }),
    ).toThrow(GameSetupError);
  });
});

describe('planning', () => {
  it('refuses a card the player cannot afford', () => {
    const state = newGame(catalog, { p0: ['two'], energy: 1 });
    expectIllegal(
      () => applyAction(catalog, state, { type: 'play', player: 0, card: uidOf(state, 0, 'two'), location: 0 }),
      'notEnoughEnergy',
    );
  });

  it(`caps a location at ${LOCATION_CAPACITY} cards per player, pending plays included`, () => {
    const state = newGame(catalog, { p0: ['a1', 'a2', 'a3', 'a4', 'a5'] });
    const filled = act(
      catalog,
      state,
      ...['a1', 'a2', 'a3', 'a4'].map((id) => ({
        type: 'play' as const,
        player: 0 as const,
        card: uidOf(state, 0, id),
        location: 0,
      })),
    ).state;
    expectIllegal(
      () => applyAction(catalog, filled, { type: 'play', player: 0, card: uidOf(state, 0, 'a5'), location: 0 }),
      'locationFull',
    );
    expect(() =>
      applyAction(catalog, filled, { type: 'play', player: 0, card: uidOf(state, 0, 'a5'), location: 1 }),
    ).not.toThrow();
  });

  it('refuses unknown locations, cards outside the hand and plays after ending the turn', () => {
    const state = newGame(catalog, { p0: ['one'] });
    const uid = uidOf(state, 0, 'one');
    for (const location of [-1, 3, 1.5]) {
      expectIllegal(
        () => applyAction(catalog, state, { type: 'play', player: 0, card: uid, location }),
        'unknownLocation',
      );
    }
    expectIllegal(
      () => applyAction(catalog, state, { type: 'play', player: 1, card: uid, location: 0 }),
      'cardNotInHand',
    );
    const ended = applyAction(catalog, state, { type: 'endTurn', player: 0 }).state;
    expectIllegal(
      () => applyAction(catalog, ended, { type: 'play', player: 0, card: uid, location: 0 }),
      'playerReady',
    );
    expectIllegal(() => applyAction(catalog, ended, { type: 'endTurn', player: 0 }), 'playerReady');
  });

  it('cancels a play this turn and refunds its energy', () => {
    const state = newGame(catalog, { p0: ['two'] });
    const uid = uidOf(state, 0, 'two');
    const played = applyAction(catalog, state, { type: 'play', player: 0, card: uid, location: 0 }).state;
    expect(played.players[0].spent).toBe(2);

    const cancelled = applyAction(catalog, played, { type: 'cancel', player: 0, card: uid }).state;
    expect(cancelled.players[0].spent).toBe(0);
    expect(cancelled.players[0].hand).toContain(uid);
    expect(cancelled.cards[uid]?.location).toBeNull();
    expectIllegal(() => applyAction(catalog, cancelled, { type: 'cancel', player: 0, card: uid }), 'cardNotPending');
  });

  it('keeps played cards off the board until both players ended the turn', () => {
    const state = newGame(catalog, { p0: ['big'] });
    const waiting = act(
      catalog,
      state,
      { type: 'play', player: 0, card: uidOf(state, 0, 'big'), location: 0 },
      { type: 'endTurn', player: 0 },
    ).state;
    expect(waiting.turn).toBe(1);
    expect(locationPowers(catalog, waiting)[0]).toEqual([0, 0]);
  });
});

describe('turn resolution', () => {
  it('reveals the plays, then starts the next turn with a draw, more energy and the next location', () => {
    const state = newGame(catalog, { p0: ['big'] });
    const handBefore = state.players[1].hand.length;
    const { state: next, events } = playTurn(catalog, state, { p0: [['big', 1]] });

    expect(powerAt(catalog, next, 0, 'big')).toBe(5);
    expect(locationPowers(catalog, next)[1]).toEqual([5, 0]);
    expect(next.turn).toBe(2);
    expect(next.players.map((player) => player.energy)).toEqual([2, 2]);
    expect(next.players[1].hand).toHaveLength(handBefore + 1);
    expect(next.locations[1]?.revealed).toBe(true);
    expect(events).toContainEqual({ type: 'turnStarted', turn: 2 });
  });

  it('lets the player winning more locations reveal first', () => {
    const state = newGame(catalog, { p0: ['one'], p1: ['big', 'two'] });
    const turn2 = playTurn(catalog, state, { p1: [['big', 0]] }).state;
    turn2.players[0].energy = 10;
    turn2.players[1].energy = 10;

    const { events } = playTurn(catalog, turn2, { p0: [['one', 1]], p1: [['two', 2]] });
    expect(events).toContainEqual({ type: 'revealPriority', player: 1 });
    const reveals = events.filter((event) => event.type === 'cardRevealed').map((event) => event.player);
    expect(reveals).toEqual([1, 0]);
  });
});

describe('end of the game', () => {
  it(`ends after turn ${MAX_TURNS} and refuses any further action`, () => {
    const ended = skipToTurn(catalog, newGame(catalog), MAX_TURNS + 1);
    expect(ended.status).toBe('ended');
    expect(ended.turn).toBe(MAX_TURNS);
    expect(ended.result?.winner).toBeNull();
    expectIllegal(() => applyAction(catalog, ended, { type: 'endTurn', player: 0 }), 'gameOver');
  });

  it('gives the win to the player controlling more locations, whatever the total power', () => {
    const state = newGame(catalog, { p0: ['one', 'two'], p1: ['big'] });
    const lastTurn = skipToTurn(catalog, state, MAX_TURNS);
    const { state: ended } = playTurn(catalog, lastTurn, {
      p0: [
        ['one', 0],
        ['two', 1],
      ],
      p1: [['big', 2]],
    });

    expect(ended.result).toEqual({
      winner: 0,
      locationWinners: [0, 0, 1],
      locationPowers: [
        [1, 0],
        [3, 0],
        [0, 5],
      ],
      totalPower: [4, 5],
    });
  });

  it('breaks a location tie with the total power', () => {
    const state = newGame(catalog, { p0: ['one'], p1: ['big'] });
    const lastTurn = skipToTurn(catalog, state, MAX_TURNS);
    const { state: ended } = playTurn(catalog, lastTurn, { p0: [['one', 0]], p1: [['big', 1]] });

    expect(ended.result?.locationWinners).toEqual([0, 1, null]);
    expect(ended.result?.winner).toBe(1);
  });
});

describe('determinism', () => {
  it('replays the same game from the same seed and actions', () => {
    const run = (): GameState => {
      let state = newGame(catalog, { p0: ['one', 'big'], p1: ['two'], seed: 'replay' });
      state = playTurn(catalog, state, { p0: [['one', 0]], p1: [['two', 0]] }).state;
      return playTurn(catalog, state, { p0: [['big', 1]] }).state;
    };
    expect(run()).toEqual(run());
  });

  it('never mutates the state it is given', () => {
    const state = newGame(catalog, { p0: ['one'] });
    const snapshot = structuredClone(state);
    playTurn(catalog, state, { p0: [['one', 0]] });
    expect(state).toEqual(snapshot);
  });

  it('shuffles decks differently for different seeds', () => {
    const hands = ['s1', 's2', 's3', 's4'].map((seed) => {
      const state = newGame(catalog, { seed });
      return state.players[0].hand.map((uid) => state.cards[uid]?.defId).join();
    });
    expect(new Set(hands).size).toBeGreaterThan(1);
  });
});
