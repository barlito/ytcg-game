import type { Catalog } from '../catalog.ts';
import { LOCATION_CAPACITY } from '../rules.ts';
import type { GameState, LocationRules, PlayerIndex } from '../state.ts';
import { locationAt, occupancy } from './state-access.ts';

// Location rules (capacity, closing turns) are properties of the terrain, read here. They only apply once it is
// revealed, and never evict a card already placed.
function rulesAt(catalog: Catalog, state: GameState, index: number): LocationRules {
  const location = locationAt(state, index);
  return location.revealed ? catalog.location(location.defId).rules : {};
}

export function capacityAt(catalog: Catalog, state: GameState, index: number): number {
  return rulesAt(catalog, state, index).capacity ?? LOCATION_CAPACITY;
}

// Why no card can be played at a location this turn, if so.
export function closedReason(catalog: Catalog, state: GameState, index: number): 'closed' | 'notOpenYet' | null {
  const { closedFromTurn, openFromTurn } = rulesAt(catalog, state, index);
  if (closedFromTurn !== undefined && state.turn >= closedFromTurn) {
    return 'closed';
  }
  return openFromTurn !== undefined && state.turn < openFromTurn ? 'notOpenYet' : null;
}

export function hasRoom(catalog: Catalog, state: GameState, player: PlayerIndex, index: number): boolean {
  return occupancy(state, player, index) < capacityAt(catalog, state, index);
}

// Where a player can play a card now: the location is open and not full.
export function canPlayAt(catalog: Catalog, state: GameState, player: PlayerIndex, index: number): boolean {
  return closedReason(catalog, state, index) === null && hasRoom(catalog, state, player, index);
}
