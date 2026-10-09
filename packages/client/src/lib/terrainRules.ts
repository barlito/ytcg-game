import { LOCATION_CAPACITY, type LocationRules } from '@ytcg-game/engine';

export type SlotKind = 'open' | 'closed' | 'blocked';

export interface TerrainState {
  capacity: number;
  // No card can be played here this turn (the engine's closedReason, read from the same rules).
  closed: 'closed' | 'notOpenYet' | null;
  // Short readable lines for the location tile.
  pills: string[];
}

function closedNow(rules: LocationRules, turn: number): TerrainState['closed'] {
  if (rules.closedFromTurn !== undefined && turn >= rules.closedFromTurn) {
    return 'closed';
  }
  return rules.openFromTurn !== undefined && turn < rules.openFromTurn ? 'notOpenYet' : null;
}

function pillsOf(rules: LocationRules, turn: number): string[] {
  const pills: string[] = [];
  if (rules.capacity !== undefined && rules.capacity < LOCATION_CAPACITY) {
    pills.push(`${String(rules.capacity)} place${rules.capacity > 1 ? 's' : ''}`);
  }
  if (rules.openFromTurn !== undefined && turn < rules.openFromTurn) {
    pills.push(`Ouvre au tour ${String(rules.openFromTurn)}`);
  }
  if (rules.closedFromTurn !== undefined) {
    pills.push(turn >= rules.closedFromTurn ? 'Fermé' : `Fermé à partir du tour ${String(rules.closedFromTurn)}`);
  }
  return pills;
}

export function terrainState(rules: LocationRules, turn: number): TerrainState {
  return {
    capacity: Math.min(rules.capacity ?? LOCATION_CAPACITY, LOCATION_CAPACITY),
    closed: closedNow(rules, turn),
    pills: pillsOf(rules, turn),
  };
}

// The empty slots of one side: usable ones first (greyed when the location is closed), then the barred ones.
export function emptySlotKinds(empty: number, state: TerrainState): SlotKind[] {
  const blocked = Math.min(empty, LOCATION_CAPACITY - state.capacity);
  const usable: SlotKind = state.closed === null ? 'open' : 'closed';
  return [
    ...Array.from({ length: empty - blocked }, () => usable),
    ...Array.from({ length: blocked }, () => 'blocked' as const),
  ];
}
