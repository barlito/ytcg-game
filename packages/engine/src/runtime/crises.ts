import { isMadnessAbility } from '../abilities/ability.ts';
import { CRISIS_IDS, crisisRule } from '../abilities/crises.ts';
import type { GameState } from '../state.ts';
import type { GameBoard } from './board.ts';
import { cardAt } from './state-access.ts';
import { stacksOf } from './statuses.ts';

// The permanent ongoing power of the crisis of a mad card (a malus is ignored by a card immune to power loss).
export function crisisBonus(state: GameState, uid: string, keepsLosses: boolean): number {
  const card = cardAt(state, uid);
  const bonus = card.crisis === null || stacksOf(card, 'mad') === 0 ? 0 : (crisisRule(card.crisis).ongoing ?? 0);
  return bonus > 0 || keepsLosses ? bonus : 0;
}

// A card without a madness effect of its own (onMad trigger or "mad" condition) draws its crisis, once per Folie.
export function startCrisis(board: GameBoard, uid: string): void {
  const card = cardAt(board.state, uid);
  if (card.zone !== 'board' || card.crisis !== null) {
    return;
  }
  if (board.definitionOf(uid).abilities.some((ability) => isMadnessAbility(ability.params))) {
    return;
  }
  card.crisis = board.rng.pick(CRISIS_IDS);
  board.recordEvent({ type: 'crisisStarted', card: uid, crisis: card.crisis });
}

// End of turn: the crisis of a mad card acts.
export function runCrisis(board: GameBoard, uid: string): void {
  const card = cardAt(board.state, uid);
  if (card.zone === 'board' && card.crisis !== null && stacksOf(card, 'mad') > 0) {
    crisisRule(card.crisis).endOfTurn?.(board, board.sourceOf(uid));
  }
}
