import type { GameBoard } from './board.ts';
import { cardAt } from './state-access.ts';
import { stacksOf } from './statuses.ts';

// The card keeps its uid, owner, location, statuses and power modifier; only its definition changes. It gets the
// innate statuses of its new form that it lacks, then its new form reveals (onReveal, never onCardPlayedHere).
export function transformCard(board: GameBoard, uid: string, into: string): void {
  const card = cardAt(board.state, uid);
  if (card.zone !== 'board' || card.defId === into || board.transformed.has(uid)) {
    return;
  }
  board.transformed.add(uid);
  const from = card.defId;
  card.transformedFrom ??= from;
  card.defId = into;
  board.recordEvent({ type: 'cardTransformed', card: uid, from, to: into });
  for (const status of board.definitionOf(uid).statuses) {
    if (stacksOf(card, status) === 0) {
      board.addStatus(uid, status, 1, { owner: card.owner, card: null });
    }
  }
  board.onTransformed(uid);
}
