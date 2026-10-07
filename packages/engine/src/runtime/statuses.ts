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
