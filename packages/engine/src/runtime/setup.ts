import type { Catalog } from '../catalog.ts';
import { GameSetupError } from '../errors.ts';
import { seedFromString } from '../rng.ts';
import { DECK_SIZE, LOCATION_COUNT, STARTING_HAND } from '../rules.ts';
import { type GameState, type LocationState, PLAYERS, type PlayerState } from '../state.ts';
import { Runtime } from './runtime.ts';

export interface PlayerSetup {
  id: string;
  deck: readonly string[];
}

export interface GameSetup {
  seed: string;
  players: readonly [PlayerSetup, PlayerSetup];
  // Pool the 3 locations are drawn from (default: every location). Exactly 3 ids = used as is, in that order.
  locations?: readonly string[];
}

export function validateDeck(catalog: Catalog, deck: readonly string[]): string[] {
  const issues: string[] = [];
  if (deck.length !== DECK_SIZE) {
    issues.push(`a deck holds exactly ${DECK_SIZE} cards, got ${deck.length}`);
  }
  if (new Set(deck).size !== deck.length) {
    issues.push('a deck holds at most one copy of each card');
  }
  for (const id of deck) {
    if (!catalog.cards.has(id)) {
      issues.push(`unknown card ${id}`);
    }
  }
  return issues;
}

export function startGame(catalog: Catalog, setup: GameSetup): Runtime {
  const pool = [...new Set(setup.locations ?? catalog.locations.keys())];
  assertValidSetup(catalog, setup, pool);

  const runtime = new Runtime(catalog, emptyState(setup));
  const { state, rng } = runtime.board;
  for (const player of PLAYERS) {
    // Instance ids are given after the shuffle so they say nothing about the deck list order.
    rng.shuffle([...setup.players[player].deck]).forEach((defId, index) => {
      const uid = `p${player}c${index + 1}`;
      state.cards[uid] = {
        uid,
        defId,
        owner: player,
        zone: 'deck',
        location: null,
        powerModifier: 0,
        playOrder: null,
        statuses: {},
      };
      state.players[player].deck.push(uid);
    });
  }
  const picked = pool.length === LOCATION_COUNT ? pool : rng.shuffle(pool).slice(0, LOCATION_COUNT);
  state.locations = picked.map((defId): LocationState => ({ defId, revealed: false, cards: [[], []] }));

  for (const player of PLAYERS) {
    runtime.board.draw(player, STARTING_HAND);
  }
  runtime.turns.start(1);
  return runtime;
}

function assertValidSetup(catalog: Catalog, setup: GameSetup, pool: readonly string[]): void {
  const issues: string[] = [];
  const [first, second] = setup.players;
  if (first.id === '' || second.id === '' || first.id === second.id) {
    issues.push('two players with distinct, non-empty ids are required');
  }
  setup.players.forEach((player, index) => {
    issues.push(...validateDeck(catalog, player.deck).map((issue) => `player ${index}: ${issue}`));
  });
  issues.push(...pool.filter((id) => !catalog.locations.has(id)).map((id) => `unknown location ${id}`));
  if (pool.length < LOCATION_COUNT) {
    issues.push(`at least ${LOCATION_COUNT} locations are required, got ${pool.length}`);
  }
  if (issues.length > 0) {
    throw new GameSetupError(issues);
  }
}

function emptyState(setup: GameSetup): GameState {
  const emptyPlayer = (id: string): PlayerState => ({
    id,
    deck: [],
    hand: [],
    pending: [],
    energy: 0,
    spent: 0,
    ready: false,
  });
  return {
    seed: setup.seed,
    rng: { s: seedFromString(setup.seed) },
    turn: 0,
    status: 'playing',
    players: [emptyPlayer(setup.players[0].id), emptyPlayer(setup.players[1].id)],
    locations: [],
    cards: {},
    nextPlayOrder: 0,
    result: null,
  };
}
