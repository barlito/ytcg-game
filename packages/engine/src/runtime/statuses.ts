import { STATUS_IDS, type StatusId, statusRule } from '../abilities/statuses.ts';
import type { CardInstance } from '../state.ts';

export function stacksOf(card: CardInstance, status: StatusId): number {
  return card.statuses[status] ?? 0;
}

export function activeStatuses(card: CardInstance): StatusId[] {
  return STATUS_IDS.filter((status) => stacksOf(card, status) > 0);
}

export function hasRule(card: CardInstance, rule: 'preventsDestroy' | 'preventsPowerLoss'): boolean {
  return activeStatuses(card).some((status) => statusRule(status)[rule] === true);
}

// The status that cancels this loss by spending one of its stacks, if any.
export function absorbingStatus(card: CardInstance, rule: 'absorbsDestroy' | 'absorbsPowerLoss'): StatusId | null {
  return activeStatuses(card).find((status) => statusRule(status)[rule] === true) ?? null;
}
