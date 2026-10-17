import { STATUS_IDS, type StatusId, statusRule } from '../abilities/statuses.ts';
import type { Origin } from '../abilities/board.ts';
import type { CardInstance } from '../state.ts';

export function stacksOf(card: CardInstance, status: StatusId): number {
  return card.statuses[status] ?? 0;
}

export function activeStatuses(card: CardInstance): StatusId[] {
  return STATUS_IDS.filter((status) => stacksOf(card, status) > 0);
}

export function hasRule(
  card: CardInstance,
  rule: 'preventsDestroy' | 'preventsPowerLoss' | 'refusesAllyBoosts',
): boolean {
  return activeStatuses(card).some((status) => statusRule(status)[rule] === true);
}

// The status that cancels this loss by spending one of its stacks, if any.
export function absorbingStatus(
  card: CardInstance,
  rule: 'absorbsDestroy' | 'absorbsPowerLoss' | 'absorbsEnemyStatus',
): StatusId | null {
  return activeStatuses(card).find((status) => statusRule(status)[rule] === true) ?? null;
}

// Enragée: a gain from another allied card is refused (its own abilities, enemies and terrains still count).
export function refusesBoost(card: CardInstance, by: Origin): boolean {
  return by.owner === card.owner && by.card !== card.uid && hasRule(card, 'refusesAllyBoosts');
}

// A one-shot power change the card's immunities let through (Coriace: no loss; Enragée: no ally gain).
export function acceptsChange(card: CardInstance, delta: number, by: Origin | undefined): boolean {
  if (delta < 0) {
    return !hasRule(card, 'preventsPowerLoss');
  }
  return by === undefined || !refusesBoost(card, by);
}
