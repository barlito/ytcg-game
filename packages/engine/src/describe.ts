import type { AbilityParams } from './abilities/ability.ts';
import type { CardFilter } from './abilities/board.ts';
import type { ConditionParams } from './abilities/conditions.ts';
import type { EffectParams } from './abilities/effects.ts';
import { type StatusId, statusRule } from './abilities/statuses.ts';
import type { TargetParams } from './abilities/targets.ts';
import type { CardDefinition, Catalog, LocationDefinition } from './catalog.ts';

const TRAIT_LABEL: Record<string, string> = { epee: 'épée' };

const TRIGGER_TEXT: Record<AbilityParams['trigger'], string> = {
  onReveal: 'À la révélation',
  ongoing: 'En continu',
  endOfTurn: 'En fin de tour',
};

interface Context {
  catalog: Catalog;
  onLocation: boolean;
}

export function describeCard(catalog: Catalog, card: CardDefinition): string[] {
  const keywords = card.statuses.map((status) => {
    const { name, rule } = statusRule(status);
    return rule === undefined ? `${name}.` : `${name} (${rule}).`;
  });
  return [...keywords, ...card.abilities.map((ability) => describeAbility(catalog, ability.params, false))];
}

export function describeLocation(catalog: Catalog, location: LocationDefinition): string[] {
  return location.abilities.map((ability) => describeAbility(catalog, ability.params, true));
}

export function describeAbility(catalog: Catalog, ability: AbilityParams, onLocation: boolean): string {
  const context: Context = { catalog, onLocation };
  const condition = ability.condition === undefined ? '' : `${describeCondition(context, ability.condition)}, `;
  const target = describeTarget(context, ability.target);
  const effects = ability.effect
    .map((effect, index) => {
      const pronoun = index > 0 && !target.self ? describeFollowingEffect(effect, target.plural) : null;
      return pronoun ?? describeEffect(context, effect, target);
    })
    .join(' et ');
  return `${TRIGGER_TEXT[ability.trigger]} : ${condition}${effects}.`;
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
function cards(context: Context, filter: CardFilter, plural: boolean): string {
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

function scope(filter: CardFilter): string {
  switch (filter.scope) {
    case 'here':
      return 'ici';
    case 'elsewhere':
      return 'sur les autres lieux';
    case 'everywhere':
      return 'sur le plateau';
  }
}

function describeCondition(context: Context, condition: ConditionParams): string {
  if (condition.type === 'turn') {
    const { min, max } = condition;
    if (min !== undefined && max !== undefined) {
      return min === max ? `au tour ${min}` : `du tour ${min} au tour ${max}`;
    }
    return min !== undefined ? `à partir du tour ${min}` : `jusqu'au tour ${max ?? ''}`;
  }
  const { min, max } = condition;
  if (max === 0) {
    return `s'il n'y a aucune ${cards(context, condition, false)} ${scope(condition)}`;
  }
  if (max !== undefined) {
    return `s'il y a entre ${min} et ${max} ${cards(context, condition, true)} ${scope(condition)}`;
  }
  if (min <= 1) {
    return `s'il y a une ${cards(context, condition, false)} ${scope(condition)}`;
  }
  return `s'il y a au moins ${min} ${cards(context, condition, true)} ${scope(condition)}`;
}

interface TargetText {
  text: string;
  plural: boolean;
  self: boolean;
}

function describeTarget(context: Context, target: TargetParams): TargetText {
  if (target.type === 'self') {
    return { text: 'cette carte', plural: false, self: true };
  }
  switch (target.pick) {
    case 'all':
      return { text: `les ${cards(context, target, true)} ${scope(target)}`, plural: true, self: false };
    case 'random':
      return { text: `une ${cards(context, target, false)} ${scope(target)} au hasard`, plural: false, self: false };
    case 'weakest':
      return {
        text: `${the(cards(context, target, false))} la plus faible ${scope(target)}`,
        plural: false,
        self: false,
      };
    case 'strongest':
      return {
        text: `${the(cards(context, target, false))} la plus forte ${scope(target)}`,
        plural: false,
        self: false,
      };
  }
}

// French elisions and contractions: « la autre » → « l'autre », « à les » → « aux », « de une » → « d'une ».
function the(noun: string): string {
  return /^[aeiouéè]/.test(noun) ? `l'${noun}` : `la ${noun}`;
}

function to(target: string): string {
  return target.startsWith('les ') ? `aux ${target.slice(4)}` : `à ${target}`;
}

function of(target: string): string {
  if (target.startsWith('les ')) {
    return `des ${target.slice(4)}`;
  }
  return /^[aeiouéè]/.test(target) ? `d'${target}` : `de ${target}`;
}

function signed(amount: number): string {
  return amount > 0 ? `+${amount}` : `−${-amount}`;
}

function statusAdjective(status: StatusId, plural: boolean): string {
  const adjective = statusRule(status).adjective;
  return plural && !adjective.endsWith('s') ? `${adjective}s` : adjective;
}

// After the first effect of an ability, the same targets are referred to by a pronoun.
function describeFollowingEffect(effect: EffectParams, plural: boolean): string | null {
  const direct = plural ? 'les' : 'la';
  const indirect = plural ? 'leur' : 'lui';
  switch (effect.type) {
    case 'addPower':
      return `${indirect} donne ${signed(effect.amount)} puissance`;
    case 'addStatus':
      return `${direct} rend ${statusAdjective(effect.status, plural)}${stacksSuffix(effect.stacks)}`;
    case 'destroy':
      return `${direct} détruit`;
    case 'removeStatus':
      return `${indirect} retire ${removedStatus(effect.status)}`;
    case 'addPowerPerCard':
    case 'draw':
      return null;
  }
}

function describeEffect(context: Context, effect: EffectParams, target: TargetText): string {
  switch (effect.type) {
    case 'addPower':
      return withTarget(`${signed(effect.amount)} puissance`, target);
    case 'addPowerPerCard':
      return `${withTarget(`${signed(effect.amount)} puissance`, target)} par ${cards(context, effect.count, false)} ${scope(effect.count)}`;
    case 'draw':
      return `${context.onLocation ? 'chaque joueur pioche' : 'pioche'} ${plural(effect.count, 'carte')}`;
    case 'destroy':
      return `détruit ${target.text}`;
    case 'addStatus':
      return `${statusVerb(effect.status, target)}${stacksSuffix(effect.stacks)}`;
    case 'removeStatus':
      return `retire ${removedStatus(effect.status)} ${of(target.text)}`;
  }
}

function withTarget(text: string, target: TargetText): string {
  return target.self ? text : `${text} ${to(target.text)}`;
}

function statusVerb(status: StatusId, target: TargetText): string {
  return target.self
    ? `devient ${statusAdjective(status, false)}`
    : `rend ${target.text} ${statusAdjective(status, target.plural)}`;
}

function removedStatus(status: StatusId | undefined): string {
  return status === undefined ? 'tous les états' : `la ${statusRule(status).name}`;
}

function stacksSuffix(stacks: number): string {
  return stacks > 1 ? ` (×${stacks})` : '';
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count > 1 ? 's' : ''}`;
}
