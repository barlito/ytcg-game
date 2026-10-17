import type { AbilityParams } from './ability.ts';
import type { CardFilter } from './board.ts';

// Every card filter of an ability: its target, its count condition, its addPowerPerCard counts.
export function abilityFilters(ability: AbilityParams): CardFilter[] {
  const filters: CardFilter[] = [];
  if (ability.target.type === 'cards') {
    filters.push(ability.target);
  }
  if (ability.condition?.type === 'count') {
    filters.push(ability.condition);
  }
  for (const effect of ability.effect) {
    if (effect.type === 'addPowerPerCard') {
      filters.push(effect.count);
    }
  }
  return filters;
}

export function readsPower(filter: CardFilter): boolean {
  return filter.minPower !== undefined || filter.maxPower !== undefined;
}

// An empty range is a typo: no card could ever match.
export function rangeIssues(filter: CardFilter): string[] {
  const issues: string[] = [];
  if (filter.minCost !== undefined && filter.maxCost !== undefined && filter.minCost > filter.maxCost) {
    issues.push('"minCost" must not exceed "maxCost"');
  }
  if (filter.minPower !== undefined && filter.maxPower !== undefined && filter.minPower > filter.maxPower) {
    issues.push('"minPower" must not exceed "maxPower"');
  }
  if (filter.status !== undefined && filter.status === filter.withoutStatus) {
    issues.push('"status" and "withoutStatus" must differ');
  }
  return issues;
}
