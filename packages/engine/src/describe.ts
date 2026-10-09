import type { AbilityParams } from './abilities/ability.ts';
import type { ConditionParams } from './abilities/conditions.ts';
import { statusRule } from './abilities/statuses.ts';
import type { TargetParams } from './abilities/targets.ts';
import type { CardDefinition, Catalog, LocationDefinition } from './catalog.ts';
import type { CurveRule } from './deck.ts';
import { describeEffect, describeFollowingEffect } from './describe-effects.ts';
import { type Context, type TargetText, cards, plural, scope, the } from './describe-text.ts';
import type { LocationRules } from './state.ts';

export { tagLabel } from './describe-text.ts';

const TRIGGER_TEXT = {
  onReveal: 'À la révélation',
  ongoing: 'En continu',
  endOfTurn: 'En fin de tour',
  onDestroyed: 'Quand cette carte est détruite',
} as const;

export function describeCard(catalog: Catalog, card: CardDefinition): string[] {
  const keywords = card.statuses.map((status) => {
    const { name, rule } = statusRule(status);
    return rule === undefined ? `${name}.` : `${name} (${rule}).`;
  });
  return [...keywords, ...card.abilities.map((ability) => describeAbility(catalog, ability.params, false))];
}

export function describeLocation(catalog: Catalog, location: LocationDefinition): string[] {
  return [
    ...describeLocationRules(location.rules),
    ...location.abilities.map((ability) => describeAbility(catalog, ability.params, true)),
  ];
}

// The rules a terrain changes (read by the game rules, not triggered).
function describeLocationRules(rules: LocationRules): string[] {
  const lines: string[] = [];
  if (rules.capacity !== undefined) {
    lines.push(`Chaque joueur ne peut poser que ${plural(rules.capacity, 'carte')} ici.`);
  }
  if (rules.openFromTurn !== undefined) {
    lines.push(`Aucune carte ne peut être posée ici avant le tour ${rules.openFromTurn}.`);
  }
  if (rules.closedFromTurn !== undefined) {
    lines.push(`Plus aucune carte ne peut être posée ici à partir du tour ${rules.closedFromTurn}.`);
  }
  return lines;
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
  return `${describeTrigger(context, ability)} : ${condition}${effects}.`;
}

function describeTrigger(context: Context, ability: AbilityParams): string {
  if (ability.trigger !== 'onCardPlayedHere') {
    return TRIGGER_TEXT[ability.trigger];
  }
  const { side = 'all', tag, status } = ability.played ?? {};
  const played = cards(context, { side, scope: 'here', includeSelf: false, tag, status }, false);
  return `Quand une ${played} est jouée ici`;
}

// « Au moins 2 cartes à 1 » / « Au plus 3 cartes à 5 ou plus »
export function describeCurveRule(rule: CurveRule): string {
  return rule.kind === 'minimum'
    ? `Au moins ${plural(rule.count, 'carte')} à ${rule.cost}`
    : `Au plus ${plural(rule.count, 'carte')} à ${rule.fromCost} ou plus`;
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
