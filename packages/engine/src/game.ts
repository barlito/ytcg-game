import type { GameAction } from './action.ts';
import type { Catalog } from './catalog.ts';
import { Runtime } from './runtime/runtime.ts';
import { type GameSetup, startGame } from './runtime/setup.ts';
import { cardAt, locationAt, occupancy } from './runtime/state-access.ts';
import { LOCATION_CAPACITY } from './rules.ts';
import type { GameEvent, GameState, PlayerIndex } from './state.ts';

export { type GameSetup, type PlayerSetup, validateDeck } from './runtime/setup.ts';

export interface Transition {
  state: GameState;
  events: GameEvent[];
}

export function createGame(catalog: Catalog, setup: GameSetup): Transition {
  const runtime = startGame(catalog, setup);
  return { state: runtime.state, events: runtime.events };
}

// Never mutates the given state: replaying the same actions from the same setup gives the same game.
export function applyAction(catalog: Catalog, state: GameState, action: GameAction): Transition {
  const runtime = new Runtime(catalog, structuredClone(state));
  runtime.actions.dispatch(action);
  return { state: runtime.state, events: runtime.events };
}

// Queries read the state as is: they never draw randomness nor mutate anything.
export function powerOf(catalog: Catalog, state: GameState, card: string): number {
  return new Runtime(catalog, state).board.power(card);
}

export interface PowerBreakdown {
  // Printed power of the card.
  printed: number;
  // Permanent modifiers (addPower effects, status rules) since it was played.
  modifier: number;
  // Ongoing bonuses, one per source card or location.
  ongoing: { from: 'card' | 'location'; defId: string; amount: number }[];
}

export function powerBreakdown(catalog: Catalog, state: GameState, card: string): PowerBreakdown {
  const board = new Runtime(catalog, state).board;
  const instance = cardAt(state, card);
  return {
    printed: catalog.card(instance.defId).power,
    modifier: instance.powerModifier,
    ongoing: board
      .ongoingBonuses(card)
      .map(({ source, amount }) =>
        source.card === null
          ? { from: 'location', defId: locationAt(state, source.location).defId, amount }
          : { from: 'card', defId: cardAt(state, source.card).defId, amount },
      ),
  };
}

export function locationPowers(catalog: Catalog, state: GameState): [number, number][] {
  return new Runtime(catalog, state).board.locationPowers();
}

export function remainingEnergy(state: GameState, player: PlayerIndex): number {
  const { energy, spent } = state.players[player];
  return energy - spent;
}

export function playableCards(catalog: Catalog, state: GameState, player: PlayerIndex): string[] {
  const left = remainingEnergy(state, player);
  return state.players[player].hand.filter((uid) => catalog.card(cardAt(state, uid).defId).cost <= left);
}

export function openLocations(state: GameState, player: PlayerIndex): number[] {
  return state.locations.flatMap((_, index) => (occupancy(state, player, index) < LOCATION_CAPACITY ? [index] : []));
}
