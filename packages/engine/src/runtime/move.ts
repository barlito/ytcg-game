import type { MoveDestination } from '../abilities/board.ts';
import type { PlayerIndex } from '../state.ts';
import type { GameBoard } from './board.ts';
import { hasRoom } from './location-rules.ts';
import { cardAt, locationAt } from './state-access.ts';

// Locations of the same side where the card could go, in board order.
function moveOptions(board: GameBoard, owner: PlayerIndex, from: number, destination: MoveDestination): number[] {
  const wanted = (index: number): boolean =>
    index !== from &&
    (destination === 'random' || index === from + (destination === 'left' ? -1 : 1)) &&
    hasRoom(board.catalog, board.state, owner, index);
  return board.state.locations.flatMap((_, index) => (wanted(index) ? [index] : []));
}

// Moves a board card to another location of its side that has a free place; nothing happens without one.
export function moveCard(board: GameBoard, uid: string, destination: MoveDestination): void {
  const card = cardAt(board.state, uid);
  if (card.zone !== 'board' || card.location === null) {
    return;
  }
  const from = card.location;
  const options = moveOptions(board, card.owner, from, destination);
  const to = destination === 'random' && options.length > 0 ? board.rng.pick(options) : options[0];
  if (to === undefined) {
    return;
  }
  const slot = locationAt(board.state, from).cards[card.owner];
  slot.splice(slot.indexOf(uid), 1);
  locationAt(board.state, to).cards[card.owner].push(uid);
  card.location = to;
  board.recordEvent({ type: 'cardMoved', card: uid, from, to });
}
