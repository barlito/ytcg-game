import { CRISIS_IDS, type CrisisId, STATUS_IDS, type StatusId, crisisRule, statusRule } from '@ytcg-game/engine';
import { type States, stacksOf } from './cardStates.ts';

export interface StatusBadge {
  id: StatusId;
  stacks: number;
  crisis: CrisisId | null;
  // « Folie : Errance », « Défonce ×2 »: the accessible name of the icon.
  title: string;
}

// The pill label starts with the status name (« Folie · Errance », « Défonce ×2 »): read it back to an icon.
export function statusBadge(label: string, states: States): StatusBadge | null {
  const id = STATUS_IDS.find((status) => label.startsWith(statusRule(status).name));
  if (id === undefined) {
    return null;
  }
  const crisis = id === 'mad' ? (CRISIS_IDS.find((c) => label.includes(` · ${crisisRule(c).name}`)) ?? null) : null;
  return { id, stacks: Math.max(1, stacksOf(states, id)), crisis, title: label.replace(' · ', ' : ') };
}

// One character per crisis, small enough to sit on the Folie icon.
export const CRISIS_MARK: Record<CrisisId, string> = {
  rage: '!',
  delirium: '~',
  wandering: '↔',
  contagion: '✱',
  implosion: '✕',
};
