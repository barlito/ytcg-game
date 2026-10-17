import type { AbilitySource, CardFilter, PlayedFilter } from '../abilities/board.ts';
import { type CardInstance, type PlayerIndex, opponentOf } from '../state.ts';
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

// Does a revealed board card pass the filter (side and scope aside)?
export function cardMatches(board: GameBoard, uid: string, source: AbilitySource, filter: CardFilter): boolean {
  if (!filter.includeSelf && uid === source.card) {
    return false;
  }
  if (!statusMatches(cardAt(board.state, uid), filter)) {
    return false;
  }
  const definition = board.definitionOf(uid);
  if (filter.tag !== undefined && !definition.tags.includes(filter.tag)) {
    return false;
  }
  return inRange(definition.cost, filter.minCost, filter.maxCost) && powerInRange(board, uid, filter);
}

function statusMatches(card: CardInstance, filter: CardFilter): boolean {
  return (
    (filter.status === undefined || stacksOf(card, filter.status) > 0) &&
    (filter.withoutStatus === undefined || stacksOf(card, filter.withoutStatus) === 0)
  );
}

function powerInRange(board: GameBoard, uid: string, filter: CardFilter): boolean {
  return (
    (filter.minPower === undefined && filter.maxPower === undefined) ||
    inRange(board.power(uid), filter.minPower, filter.maxPower)
  );
}

function inRange(value: number, min: number | undefined, max: number | undefined): boolean {
  return (min === undefined || value >= min) && (max === undefined || value <= max);
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
