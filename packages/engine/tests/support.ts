import {
  type CardFile,
  type Catalog,
  DECK_SIZE,
  type GameAction,
  type GameEvent,
  type GameState,
  type LocationFile,
  type PlayerIndex,
  applyAction,
  createGame,
  loadCatalog,
  powerOf,
} from '../src/index.ts';

export type CardInput = CardFile['cards'][number];
export type LocationInput = LocationFile['locations'][number];

export function card(id: string, overrides: Partial<CardInput> = {}): CardInput {
  return { id, name: id, rarity: 'common', cost: 1, power: 1, ...overrides };
}

const FILLERS = Array.from({ length: DECK_SIZE }, (_, i) => card(`filler-${i + 1}`, { cost: 6, power: 0 }));
const BLANK_LOCATIONS: LocationInput[] = ['loc-a', 'loc-b', 'loc-c'].map((id) => ({ id, name: id }));

export function catalogWith(cards: CardInput[] = [], locations: LocationInput[] = []): Catalog {
  return loadCatalog({
    cardFiles: [
      { name: 'test.json', content: { extension: { slug: 'test', name: 'Test' }, cards: [...cards, ...FILLERS] } },
    ],
    locationFiles: [{ name: 'locations.json', content: { locations: [...BLANK_LOCATIONS, ...locations] } }],
  });
}

// Pads the given card ids with fillers up to a legal deck.
export function deckOf(ids: readonly string[] = []): string[] {
  return [...ids, ...FILLERS.map((filler) => filler.id).filter((id) => !ids.includes(id))].slice(0, DECK_SIZE);
}

export interface TestGameOptions {
  p0?: string[];
  p1?: string[];
  locations?: string[];
  seed?: string;
  energy?: number;
}

// Starts a game where the listed cards are already in hand, with plenty of energy by default.
export function newGame(catalog: Catalog, options: TestGameOptions = {}): GameState {
  const { p0 = [], p1 = [], locations = ['loc-a', 'loc-b', 'loc-c'], seed = 'test', energy = 10 } = options;
  const { state } = createGame(catalog, {
    seed,
    players: [
      { id: 'alice', deck: deckOf(p0) },
      { id: 'bob', deck: deckOf(p1) },
    ],
    locations,
  });
  p0.forEach((id) => moveToHand(state, 0, id));
  p1.forEach((id) => moveToHand(state, 1, id));
  state.players[0].energy = energy;
  state.players[1].energy = energy;
  return state;
}

export function uidOf(state: GameState, player: PlayerIndex, defId: string): string {
  const instance = Object.values(state.cards).find((c) => c.owner === player && c.defId === defId);
  if (instance === undefined) {
    throw new Error(`player ${player} has no ${defId}`);
  }
  return instance.uid;
}

export function moveToHand(state: GameState, player: PlayerIndex, defId: string): string {
  const uid = uidOf(state, player, defId);
  const playerState = state.players[player];
  if (!playerState.hand.includes(uid)) {
    playerState.deck.splice(playerState.deck.indexOf(uid), 1);
    playerState.hand.push(uid);
    const instance = state.cards[uid];
    if (instance !== undefined) {
      instance.zone = 'hand';
    }
  }
  return uid;
}

export function act(
  catalog: Catalog,
  state: GameState,
  ...actions: GameAction[]
): { state: GameState; events: GameEvent[] } {
  let current = state;
  const events: GameEvent[] = [];
  for (const action of actions) {
    const transition = applyAction(catalog, current, action);
    current = transition.state;
    events.push(...transition.events);
  }
  return { state: current, events };
}

export type Plays = [defId: string, location: number][];

// Plays both sides (by card definition id) then ends the turn for both players.
export function playTurn(
  catalog: Catalog,
  state: GameState,
  plays: { p0?: Plays; p1?: Plays } = {},
): { state: GameState; events: GameEvent[] } {
  const actions: GameAction[] = [];
  for (const [player, list] of [
    [0, plays.p0 ?? []],
    [1, plays.p1 ?? []],
  ] as const) {
    for (const [defId, location] of list) {
      actions.push({ type: 'play', player, card: uidOf(state, player, defId), location });
    }
  }
  actions.push({ type: 'endTurn', player: 0 }, { type: 'endTurn', player: 1 });
  return act(catalog, state, ...actions);
}

// Ends turns without playing until the given turn starts (or the game ends), keeping energy high.
export function skipToTurn(catalog: Catalog, state: GameState, turn: number, energy = 10): GameState {
  let current = state;
  while (current.turn < turn && current.status === 'playing') {
    current = playTurn(catalog, current).state;
  }
  current.players[0].energy = energy;
  current.players[1].energy = energy;
  return current;
}

export function powerAt(catalog: Catalog, state: GameState, player: PlayerIndex, defId: string): number {
  const instance = state.cards[uidOf(state, player, defId)];
  if (instance?.zone !== 'board') {
    throw new Error(`${defId} of player ${player} is not on the board`);
  }
  return powerOf(catalog, state, instance.uid);
}
