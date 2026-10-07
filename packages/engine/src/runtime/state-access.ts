import type { CardInstance, GameState, LocationState, PlayerIndex } from '../state.ts';

export function cardAt(state: GameState, uid: string): CardInstance {
  const card = state.cards[uid];
  if (card === undefined) {
    throw new RangeError(`Unknown card instance "${uid}"`);
  }
  return card;
}

export function locationAt(state: GameState, index: number): LocationState {
  const location = state.locations[index];
  if (location === undefined) {
    throw new RangeError(`Unknown location ${index}`);
  }
  return location;
}

// Cards a player has at a location, face-down plays of this turn included.
export function occupancy(state: GameState, player: PlayerIndex, location: number): number {
  const placed = state.locations[location]?.cards[player].length ?? 0;
  const pending = state.players[player].pending.filter((uid) => cardAt(state, uid).location === location).length;
  return placed + pending;
}
