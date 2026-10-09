import { describe, expect, it } from 'vitest';
import {
  type GameAction,
  type GameState,
  PLAYERS,
  Rng,
  applyAction,
  buildRandomDeck,
  checkInvariants,
  createGame,
  gameActionSchema,
  openLocations,
  playableCards,
} from '../src/index.ts';
import { loadDataDir } from '../src/sim/data.ts';

const catalog = loadDataDir();

function legalDeck(rng: Rng): string[] {
  return buildRandomDeck(catalog, rng) ?? [];
}

// Both players play their first playable card (sometimes taken back), checking the invariants after each action.
function playCheckedTurn(start: GameState, rng: Rng): GameState {
  let state = start;
  for (const player of PLAYERS) {
    const actions: GameAction[] = [];
    const card = playableCards(catalog, state, player)[0];
    const location = openLocations(catalog, state, player)[0];
    if (card !== undefined && location !== undefined) {
      actions.push({ type: 'play', player, card, location });
      if (rng.int(4) === 0) {
        actions.push({ type: 'cancel', player, card });
      }
    }
    actions.push({ type: 'endTurn', player });
    for (const action of actions) {
      state = applyAction(catalog, state, action).state;
      expect(checkInvariants(state)).toEqual([]);
    }
  }
  return state;
}

describe('state invariants', () => {
  it('keeps every card in exactly one place after every action of random games', () => {
    for (let game = 0; game < 200; game++) {
      const rng = new Rng({ s: game + 1 });
      let { state } = createGame(catalog, {
        seed: `invariants:${game}`,
        players: [
          { id: 'a', deck: legalDeck(rng) },
          { id: 'b', deck: legalDeck(rng) },
        ],
      });
      expect(checkInvariants(state)).toEqual([]);
      while (state.status === 'playing') {
        state = playCheckedTurn(state, rng);
      }
    }
  });

  it('reports a card listed in two places', () => {
    const { state } = createGame(catalog, {
      seed: 'broken',
      players: [
        { id: 'a', deck: legalDeck(new Rng({ s: 1 })) },
        { id: 'b', deck: legalDeck(new Rng({ s: 2 })) },
      ],
    });
    const uid = state.players[0].hand[0] ?? '';
    state.players[0].deck.push(uid);
    expect(checkInvariants(state)).toEqual([`${uid} (hand) found in [deck:0, hand:0]`]);
  });
});

describe('action schema', () => {
  it('accepts well-formed actions and refuses the rest', () => {
    expect(gameActionSchema.safeParse({ type: 'play', player: 1, card: 'p1c3', location: 2 }).success).toBe(true);
    expect(gameActionSchema.safeParse({ type: 'endTurn', player: 0 }).success).toBe(true);
    for (const bad of [
      { type: 'play', player: 2, card: 'x', location: 0 },
      { type: 'play', player: 0, card: '', location: 0 },
      { type: 'play', player: 0, card: 'x', location: 1.5 },
      { type: 'teleport', player: 0 },
      null,
    ]) {
      expect(gameActionSchema.safeParse(bad).success).toBe(false);
    }
  });
});
