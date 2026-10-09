import type { AbilitySource, CardFilter, PlayedFilter } from '../abilities/board.ts';
import { type PlayerIndex, opponentOf } from '../state.ts';
import type { GameBoard } from './board.ts';
import { cardAt } from './state-access.ts';
import { stacksOf } from './statuses.ts';

export function inScope(filter: CardFilter, source: AbilitySource, location: number): boolean {
  switch (filter.scope) {
    case 'here':
      return location === source.location;
    case 'elsewhere':
      return location !== source.location;
    case 'everywhere':
      return true;
  }
}

export function onSide(filter: CardFilter, source: AbilitySource, player: PlayerIndex): boolean {
  return sideMatches(filter.side, source.owner, player);
}

// Does the card that was just played pass the filter of an onCardPlayedHere ability?
export function playedMatches(board: GameBoard, source: AbilitySource, uid: string, filter: PlayedFilter): boolean {
  const played = cardAt(board.state, uid);
  if (uid === source.card || !sideMatches(filter.side, source.owner, played.owner)) {
    return false;
  }
  if (filter.status !== undefined && stacksOf(played, filter.status) === 0) {
    return false;
  }
  return filter.tag === undefined || board.definitionOf(uid).tags.includes(filter.tag);
}

// A location has no owner: only side "all" can match there.
function sideMatches(side: PlayedFilter['side'], owner: PlayerIndex | null, other: PlayerIndex): boolean {
  if (side === 'all') {
    return true;
  }
  if (owner === null) {
    return false;
  }
  return other === (side === 'ally' ? owner : opponentOf(owner));
}
