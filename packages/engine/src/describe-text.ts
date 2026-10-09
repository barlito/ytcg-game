import type { CardFilter } from './abilities/board.ts';
import { type StatusId, statusRule } from './abilities/statuses.ts';
import type { Catalog } from './catalog.ts';

const TRAIT_LABEL: Record<string, string> = { epee: 'épée' };
export interface Context {
  catalog: Catalog;
  onLocation: boolean;
}

export function tagLabel(catalog: Catalog, tag: string): string {
  const [family = '', value = ''] = tag.split(':');
  if (family === 'universe') {
    return catalog.extensions.get(value) ?? value;
  }
  if (family === 'trait') {
    return TRAIT_LABEL[value] ?? value;
  }
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
// « autre carte Benj alliée » / « autres cartes Benj alliées »
export function cards(context: Context, filter: CardFilter, plural: boolean): string {
  const s = plural ? 's' : '';
  const other =
    !filter.includeSelf && !context.onLocation && filter.side !== 'enemy' && filter.scope !== 'elsewhere'
      ? `autre${s} `
      : '';
  const tag = filter.tag === undefined ? '' : ` ${tagLabel(context.catalog, filter.tag)}`;
  const status = filter.status === undefined ? '' : ` ${statusRule(filter.status).adjective}${s}`;
  const side = filter.side === 'all' ? '' : ` ${filter.side === 'ally' ? 'alliée' : 'ennemie'}${s}`;
  return `${other}carte${s}${tag}${status}${side}`;
}

export function scope(filter: CardFilter): string {
  switch (filter.scope) {
    case 'here':
      return 'ici';
    case 'elsewhere':
      return 'sur les autres lieux';
    case 'everywhere':
      return 'sur le plateau';
  }
}

export interface TargetText {
  text: string;
  plural: boolean;
  self: boolean;
}

// French elisions and contractions: « la autre » → « l'autre », « à les » → « aux », « de une » → « d'une ».
export function the(noun: string): string {
  return /^[aeiouéè]/.test(noun) ? `l'${noun}` : `la ${noun}`;
}

export function to(target: string): string {
  return target.startsWith('les ') ? `aux ${target.slice(4)}` : `à ${target}`;
}

export function of(target: string): string {
  if (target.startsWith('les ')) {
    return `des ${target.slice(4)}`;
  }
  return /^[aeiouéè]/.test(target) ? `d'${target}` : `de ${target}`;
}

export function signed(amount: number): string {
  return amount > 0 ? `+${amount}` : `−${-amount}`;
}

export function statusAdjective(status: StatusId, plural: boolean): string {
  const adjective = statusRule(status).adjective;
  return plural && !adjective.endsWith('s') ? `${adjective}s` : adjective;
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count > 1 ? 's' : ''}`;
}
