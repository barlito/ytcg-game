import type { PlayerView } from '@ytcg-game/engine';
import type { ActionInput } from '@ytcg-game/server/protocol';

// A hand card to play, or an own face-down card of this turn to take back or move.
export interface DraggedCard {
  uid: string;
  origin: 'hand' | 'pending';
}

export type DropTarget = { kind: 'location'; index: number } | { kind: 'hand' };

const LOCATION_PREFIX = 'location:';

export function dropId(target: DropTarget): string {
  return target.kind === 'hand' ? 'hand' : `${LOCATION_PREFIX}${target.index}`;
}

export function parseDropId(id: string | number | null | undefined): DropTarget | null {
  if (id === 'hand') {
    return { kind: 'hand' };
  }
  if (typeof id === 'string' && id.startsWith(LOCATION_PREFIX)) {
    const index = Number(id.slice(LOCATION_PREFIX.length));
    return Number.isInteger(index) ? { kind: 'location', index } : null;
  }
  return null;
}

function pendingLocation(view: PlayerView, uid: string): number | null {
  return view.locations.find((location) => location.yourPending.some((card) => card.uid === uid))?.index ?? null;
}

// The engine decides through the view (playable cards, open locations): nothing is re-computed here.
export function canDrop(view: PlayerView, dragged: DraggedCard, target: DropTarget): boolean {
  if (target.kind === 'hand') {
    return dragged.origin === 'pending' && !view.ready;
  }
  if (!view.openLocations.includes(target.index)) {
    return false;
  }
  if (dragged.origin === 'hand') {
    return view.playableCards.includes(dragged.uid);
  }
  const from = pendingLocation(view, dragged.uid);
  return from !== null && from !== target.index;
}

// The actions a drop sends: play, take back, or take back then play elsewhere.
export function dropActions(view: PlayerView, dragged: DraggedCard, target: DropTarget | null): ActionInput[] {
  if (target === null || !canDrop(view, dragged, target)) {
    return [];
  }
  if (target.kind === 'hand') {
    return [{ type: 'cancel', card: dragged.uid }];
  }
  const play: ActionInput = { type: 'play', card: dragged.uid, location: target.index };
  return dragged.origin === 'hand' ? [play] : [{ type: 'cancel', card: dragged.uid }, play];
}
