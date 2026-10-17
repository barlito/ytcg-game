import { overridesStatus } from '../abilities/ability.ts';
import { STATUS_IDS, type StatusId, type StatusRule, statusRule } from '../abilities/statuses.ts';
import { type PlayerIndex, opponentOf } from '../state.ts';
import type { GameBoard } from './board.ts';
import { cardAt } from './state-access.ts';
import { absorbingStatus, activeStatuses, stacksOf } from './statuses.ts';

// The default rule of a status for this card, or null when the card defines its own effect for it.
export function ruleFor(board: GameBoard, uid: string, status: StatusId): StatusRule | null {
  return overridesStatus(board.definitionOf(uid).abilities, status) ? null : statusRule(status);
}

// A status switching abilities off (Endormie, Charmée) follows the generic rule: the card's own effect for it wins.
export function abilitiesOff(board: GameBoard, uid: string): boolean {
  const card = cardAt(board.state, uid);
  return activeStatuses(card).some((status) => ruleFor(board, uid, status)?.disablesAbilities === true);
}

export interface StatusChange {
  status: StatusId;
  stacks: number;
  // Owner of the card that applies it; null for a terrain (belongs to nobody).
  by: PlayerIndex | null;
}

export function addStatus(board: GameBoard, uid: string, { status, stacks, by }: StatusChange): void {
  const card = cardAt(board.state, uid);
  if (card.zone !== 'board' || stacks <= 0) {
    return;
  }
  if (absorbed(board, uid, { status, stacks, by })) {
    return;
  }
  const previous = stacksOf(card, status);
  const total = previous + stacks;
  card.statuses[status] = total;
  board.recordEvent({ type: 'statusChanged', card: uid, status, stacks: total });
  const rule = ruleFor(board, uid, status);
  if (previous === 0) {
    rule?.onGained?.(board, uid);
    board.onStatusGained(uid, status);
  }
  rule?.onStacksChanged?.(board, uid, total);
}

// A shield (Protection) cancels a status put by an enemy card, whatever the stacks, but never a shield itself.
function absorbed(board: GameBoard, uid: string, { status, by }: StatusChange): boolean {
  const card = cardAt(board.state, uid);
  const shield = by === opponentOf(card.owner) ? absorbingStatus(card, 'absorbsEnemyStatus') : null;
  if (shield === null || shield === status) {
    return false;
  }
  dropStack(board, uid, shield, true);
  return true;
}

export function removeStatus(board: GameBoard, uid: string, status: StatusId | null): void {
  const card = cardAt(board.state, uid);
  for (const id of status === null ? STATUS_IDS : [status]) {
    if (stacksOf(card, id) > 0) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- statuses is a plain JSON record
      delete card.statuses[id];
      board.recordEvent({ type: 'statusChanged', card: uid, status: id, stacks: 0 });
    }
    if (id === 'mad') {
      card.crisis = null;
    }
  }
}

// One stack goes away: a shield paying to cancel something (`spent`), or a status wearing off (Endormie).
export function dropStack(board: GameBoard, uid: string, status: StatusId, spent: boolean): void {
  const card = cardAt(board.state, uid);
  const left = stacksOf(card, status) - 1;
  if (left > 0) {
    card.statuses[status] = left;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- statuses is a plain JSON record
    delete card.statuses[status];
  }
  board.recordEvent({
    type: 'statusChanged',
    card: uid,
    status,
    stacks: left,
    ...(spent ? { spent: true as const } : {}),
  });
}
