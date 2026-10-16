import { overridesStatus } from '../abilities/ability.ts';
import { STATUS_IDS, type StatusId, type StatusRule, statusRule } from '../abilities/statuses.ts';
import type { GameBoard } from './board.ts';
import { cardAt } from './state-access.ts';
import { stacksOf } from './statuses.ts';

// The default rule of a status for this card, or null when the card defines its own effect for it.
export function ruleFor(board: GameBoard, uid: string, status: StatusId): StatusRule | null {
  return overridesStatus(board.definitionOf(uid).abilities, status) ? null : statusRule(status);
}

export function addStatus(board: GameBoard, uid: string, status: StatusId, stacks: number): void {
  const card = cardAt(board.state, uid);
  if (card.zone !== 'board' || stacks <= 0) {
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

// A shield status pays one stack to cancel what was about to happen.
export function spendStack(board: GameBoard, uid: string, status: StatusId): void {
  const card = cardAt(board.state, uid);
  const left = stacksOf(card, status) - 1;
  if (left > 0) {
    card.statuses[status] = left;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- statuses is a plain JSON record
    delete card.statuses[status];
  }
  board.recordEvent({ type: 'statusChanged', card: uid, status, stacks: left, spent: true });
}
