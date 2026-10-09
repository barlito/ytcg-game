import type { CardView } from '@ytcg-game/engine';

export type States = CardView['statuses'] | undefined;

export function stacksOf(states: States, id: keyof CardView['statuses']): number {
  return states?.[id] ?? 0;
}

// Classes for the lasting looks of a state (the drunk sway, the shield).
export function stateClasses(states: States): string[] {
  return [stacksOf(states, 'drunk') > 0 ? 'is-drunk' : '', stacksOf(states, 'protected') > 0 ? 'is-shielded' : ''];
}

// Overheat stacks as the `data-heat` attribute (absent without the status).
export function heatOf(states: States): number | undefined {
  const heat = stacksOf(states, 'overheat');
  return heat > 0 ? heat : undefined;
}
