import type { CardView } from '@ytcg-game/engine';

export type States = CardView['statuses'] | undefined;

export function stacksOf(states: States, id: keyof CardView['statuses']): number {
  return states?.[id] ?? 0;
}

// Classes for the lasting looks of a state (the drunk sway, the shield, the dimmed card whose abilities are off).
export function stateClasses(states: States): string[] {
  const off = stacksOf(states, 'asleep') > 0 || stacksOf(states, 'charmed') > 0;
  return [
    stacksOf(states, 'drunk') > 0 ? 'is-drunk' : '',
    stacksOf(states, 'protected') > 0 ? 'is-shielded' : '',
    off ? 'is-dormant' : '',
  ];
}

// Overheat stacks as the `data-heat` attribute (absent without the status).
export function heatOf(states: States): number | undefined {
  const heat = stacksOf(states, 'overheat');
  return heat > 0 ? heat : undefined;
}
