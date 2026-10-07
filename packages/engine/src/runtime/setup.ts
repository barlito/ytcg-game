import type { Catalog } from '../catalog.ts';
import { deckCurveIssues, guaranteeOpening } from '../deck.ts';
import { GameSetupError } from '../errors.ts';
import { type Rng, seedFromString } from '../rng.ts';
import { DECK_SIZE, LOCATION_COUNT, OPENING_CARDS, STARTING_HAND } from '../rules.ts';
import { type GameState, type LocationState, PLAYERS, type PlayerIndex, type PlayerState } from '../state.ts';
import { Runtime } from './runtime.ts';

export interface PlayerSetup {
  id: string;
  deck: readonly string[];
  // The player's location card, placed on one of the three locations.
  location?: string;
}

export interface GameSetup {
  seed: string;
  players: readonly [PlayerSetup, PlayerSetup];
  // Pool the random location is drawn from (default: every location). Exactly 3 ids = used as is, in that order.
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
  const unknown = deck.filter((id) => !catalog.cards.has(id));
  issues.push(...unknown.map((id) => `unknown card ${id}`));
  return unknown.length === 0 ? [...issues, ...deckCurveIssues(catalog, deck)] : issues;
}

export function startGame(catalog: Catalog, setup: GameSetup): Runtime {
  assertValidSetup(catalog, setup);
  const runtime = new Runtime(catalog, emptyState(setup));
  const { state, rng } = runtime.board;
  for (const player of PLAYERS) {
    const deck = rng.shuffle([...setup.players[player].deck]);
    guaranteeOpening(deck, (id) => catalog.card(id).cost, OPENING_CARDS, rng);
    // Instance ids are given after the shuffle so they say nothing about the deck list order.
    deck.forEach((defId, index) => {
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
  state.locations = pickLocations(catalog, setup, rng);
  for (const player of PLAYERS) {
    runtime.board.draw(player, STARTING_HAND);
  }
  runtime.turns.start(1);
  return runtime;
}

// Both chosen locations plus random ones, shuffled over the positions (so over the reveal order too).
function pickLocations(catalog: Catalog, setup: GameSetup, rng: Rng): LocationState[] {
  const located = (defId: string, chosenBy: PlayerIndex | null): LocationState => ({
    defId,
    chosenBy,
    revealed: false,
    cards: [[], []],
  });
  if (setup.locations?.length === LOCATION_COUNT) {
    return setup.locations.map((defId) => located(defId, null));
  }
  const chosen = PLAYERS.flatMap((player) => {
    const defId = setup.players[player].location;
    return defId === undefined ? [] : [located(defId, player)];
  });
  const taken = new Set(chosen.map((location) => location.defId));
  const pool = [...new Set(setup.locations ?? catalog.locations.keys())].filter((id) => !taken.has(id));
  const random = rng.shuffle(pool).slice(0, LOCATION_COUNT - chosen.length);
  return rng.shuffle([...chosen, ...random.map((defId) => located(defId, null))]);
}

function assertValidSetup(catalog: Catalog, setup: GameSetup): void {
  const issues: string[] = [];
  const [first, second] = setup.players;
  if (first.id === '' || second.id === '' || first.id === second.id) {
    issues.push('two players with distinct, non-empty ids are required');
  }
  setup.players.forEach((player, index) => {
    issues.push(...validateDeck(catalog, player.deck).map((issue) => `player ${index}: ${issue}`));
    if (player.location !== undefined && !catalog.locations.has(player.location)) {
      issues.push(`player ${index}: unknown location ${player.location}`);
    }
  });
  const pool = [...new Set(setup.locations ?? catalog.locations.keys())];
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
    mulliganUsed: false,
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
