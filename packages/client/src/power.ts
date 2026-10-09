import { type CardView, STATUS_IDS, type StatusId, crisisRule, statusRule } from '@ytcg-game/engine';
import { catalog } from './catalog.ts';

export type PowerTrend = 'up' | 'down' | 'even';

export function powerTrend(card: CardView): PowerTrend {
  const { printed } = card.breakdown;
  if (card.power === printed) {
    return 'even';
  }
  return card.power > printed ? 'up' : 'down';
}

export interface PowerLine {
  label: string;
  amount: number;
}

function sourceName(from: 'card' | 'location', defId: string): string {
  return from === 'card' ? catalog.card(defId).name : catalog.location(defId).name;
}

// Base, permanent modifier and every ongoing source; the total is the card power.
export function powerLines(card: CardView): PowerLine[] {
  const { printed, modifier, ongoing } = card.breakdown;
  const lines: PowerLine[] = [{ label: 'Base', amount: printed }];
  if (modifier !== 0) {
    lines.push({ label: 'Effets subis', amount: modifier });
  }
  for (const bonus of ongoing) {
    lines.push({ label: `Continu · ${sourceName(bonus.from, bonus.defId)}`, amount: bonus.amount });
  }
  return lines;
}

export function signedAmount(amount: number): string {
  if (amount === 0) {
    return '0';
  }
  return `${amount > 0 ? '+' : '−'}${Math.abs(amount)}`;
}

export interface StatusLine {
  id: StatusId;
  name: string;
  stacks: number;
  rule: string;
}

const NO_RULE = 'Sans effet propre : d’autres cartes la lisent.';
const MAD_OWN_RULE = 'Ses effets de folie sont décrits sur la carte.';

export function statusLines(card: CardView): StatusLine[] {
  return STATUS_IDS.flatMap((id) => {
    const stacks = card.statuses[id] ?? 0;
    if (stacks <= 0) {
      return [];
    }
    const { name, rule } = statusRule(id);
    if (id === 'mad') {
      return [madLine(card, name, stacks)];
    }
    return [{ id, name, stacks, rule: rule === undefined ? NO_RULE : capitalize(rule) }];
  });
}

// The Folie pill names the crisis (« Folie · Errance ») and the tooltip explains it.
function madLine(card: CardView, name: string, stacks: number): StatusLine {
  if (card.crisis === null) {
    return { id: 'mad', name, stacks, rule: MAD_OWN_RULE };
  }
  const crisis = crisisRule(card.crisis);
  return { id: 'mad', name: `${name} · ${crisis.name}`, stacks, rule: crisis.description };
}

function capitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}
