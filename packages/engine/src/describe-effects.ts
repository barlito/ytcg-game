import { type EffectParams, removedStatuses } from './abilities/effects.ts';
import { type StatusId, statusRule } from './abilities/statuses.ts';
import {
  type Context,
  type TargetText,
  cards,
  of,
  plural,
  scope,
  signed,
  statusAdjective,
  tagLabel,
  the,
  to,
} from './describe-text.ts';

type PowerEffect = Extract<EffectParams, { type: 'addPower' | 'addPowerPerCard' | 'stealPower' }>;
type HandEffect = Extract<EffectParams, { type: 'draw' | 'move' | 'addCost' | 'addToHand' }>;

const TAG_PLURAL: Partial<Record<string, string>> = { 'trait:machine': 'machines' };

const DESTINATION_TEXT = {
  random: 'vers un autre lieu au hasard',
  left: 'vers le lieu de gauche',
  right: 'vers le lieu de droite',
} as const;

type Following<K extends EffectParams['type']> = (
  effect: Extract<EffectParams, { type: K }>,
  plural: boolean,
) => string;

// After the first effect of an ability, the same targets are referred to by a pronoun (null = no short form).
const FOLLOWING: { [K in EffectParams['type']]: Following<K> | null } = {
  addPower: (effect, plural) => `${plural ? 'leur' : 'lui'} donne ${signed(effect.amount)} puissance`,
  addStatus: (effect, plural) =>
    `${plural ? 'les' : 'la'} rend ${statusAdjective(effect.status, plural)}${stacksSuffix(effect.stacks)}${onlyTagSuffix(effect)}`,
  destroy: (_effect, plural) => `${plural ? 'les' : 'la'} détruit`,
  removeStatus: (effect, plural) => `${plural ? 'leur' : 'lui'} retire ${removedStatus(effect)}`,
  stealPower: (effect, plural) => `${plural ? 'leur' : 'lui'} vole ${effect.amount} puissance`,
  move: (effect, plural) => `${plural ? 'les' : 'la'} déplace ${DESTINATION_TEXT[effect.destination]}`,
  addPowerPerCard: null,
  draw: null,
  addCost: null,
  addToHand: null,
};

export function describeFollowingEffect(effect: EffectParams, plural: boolean): string | null {
  // TypeScript cannot correlate effect.type with the matching entry: the table type guarantees it.
  const describe = FOLLOWING[effect.type] as Following<EffectParams['type']> | null;
  return describe === null ? null : describe(effect, plural);
}

const POWER_EFFECTS: ReadonlySet<EffectParams['type']> = new Set(['addPower', 'addPowerPerCard', 'stealPower']);

function isPowerEffect(effect: EffectParams): effect is PowerEffect {
  return POWER_EFFECTS.has(effect.type);
}

export function describeEffect(context: Context, effect: EffectParams, target: TargetText): string {
  if (isPowerEffect(effect)) {
    return describePowerEffect(context, effect, target);
  }
  switch (effect.type) {
    case 'destroy':
      return `détruit ${target.text}`;
    case 'addStatus':
      return describeAddStatus(effect, target);
    case 'removeStatus':
      return `retire ${removedStatus(effect)} ${of(target.text)}`;
    case 'draw':
    case 'move':
    case 'addCost':
    case 'addToHand':
      return describeHandEffect(context, effect, target);
  }
}

function describePowerEffect(context: Context, effect: PowerEffect, target: TargetText): string {
  switch (effect.type) {
    case 'addPower':
      return withTarget(`${signed(effect.amount)} puissance`, target);
    case 'addPowerPerCard':
      return `${withTarget(`${signed(effect.amount)} puissance`, target)} par ${cards(context, effect.count, false)} ${scope(effect.count)}`;
    case 'stealPower':
      return `vole ${effect.amount} puissance ${to(target.text)}`;
  }
}

function describeHandEffect(context: Context, effect: HandEffect, target: TargetText): string {
  switch (effect.type) {
    case 'draw':
      return `${context.onLocation ? 'chaque joueur pioche' : 'pioche'} ${plural(effect.count, 'carte')}`;
    case 'move':
      return `${target.self ? 'se déplace' : `déplace ${target.text}`} ${DESTINATION_TEXT[effect.destination]}`;
    case 'addCost':
      return describeCost(context, effect);
    case 'addToHand':
      return describeAddToHand(context, effect);
  }
}

function describeCost(context: Context, effect: Extract<EffectParams, { type: 'addCost' }>): string {
  const tag = effect.tag === undefined ? '' : ` ${tagLabel(context.catalog, effect.tag)}`;
  const change = `${Math.abs(effect.amount)} de ${effect.amount < 0 ? 'moins' : 'plus'}`;
  const owner = context.onLocation ? ' de chaque joueur' : '';
  return effect.cards === 'next'
    ? `la prochaine carte${tag} jouée${owner} coûte ${change}`
    : `les cartes${tag} en main${owner} coûtent ${change}`;
}

function describeAddToHand(context: Context, effect: Extract<EffectParams, { type: 'addToHand' }>): string {
  const name = effect.card === undefined ? null : (context.catalog.cards.get(effect.card)?.name ?? effect.card);
  const count = effect.count > 1 ? `${effect.count} ` : '';
  const what =
    name === null ? `${effect.count > 1 ? `${count}copies` : 'une copie'} de cette carte` : `${count}« ${name} »`;
  return `${context.onLocation ? 'chaque joueur reçoit' : 'ajoute'} ${what} en main`;
}

function withTarget(text: string, target: TargetText): string {
  return target.self ? text : `${text} ${to(target.text)}`;
}

function statusVerb(status: StatusId, target: TargetText): string {
  return target.self
    ? `devient ${statusAdjective(status, false)}`
    : `rend ${target.text} ${statusAdjective(status, target.plural)}`;
}

// « la Défonce et la Surchauffe » / « l'Ivresse, la Folie et la Défonce »
function removedStatus(effect: Extract<EffectParams, { type: 'removeStatus' }>): string {
  const statuses = removedStatuses(effect);
  if (statuses === null) {
    return 'tous les états';
  }
  const names = statuses.map((status) => the(statusRule(status).name));
  const last = names.pop() ?? '';
  return names.length === 0 ? last : `${names.join(', ')} et ${last}`;
}

function describeAddStatus(effect: Extract<EffectParams, { type: 'addStatus' }>, target: TargetText): string {
  const only = target.self ? '' : onlyTagSuffix(effect);
  return `${statusVerb(effect.status, target)}${stacksSuffix(effect.stacks)}${only}`;
}

// « (machines seulement) »: the status only lands on the cards of its tag.
function onlyTagSuffix(effect: Extract<EffectParams, { type: 'addStatus' }>): string {
  const tag = effect.anyCard ? undefined : statusRule(effect.status).onlyTag;
  return tag === undefined ? '' : ` (${TAG_PLURAL[tag] ?? tag} seulement)`;
}

function stacksSuffix(stacks: number): string {
  return stacks > 1 ? ` (×${stacks})` : '';
}
