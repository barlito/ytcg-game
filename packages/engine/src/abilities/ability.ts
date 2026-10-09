import { z } from 'zod';
import { type CardFilter, type Condition, type Effect, type TargetSelector, playedFilterSchema } from './board.ts';
import { conditionSchema, createCondition } from './conditions.ts';
import { ONGOING_EFFECTS, UNTARGETED_EFFECTS, createEffect, effectSchema } from './effects.ts';
import { createTarget, targetSchema } from './targets.ts';

// onCardPlayedHere: another card is revealed on this location after this one. onDestroyed: this card was destroyed.
export const TRIGGERS = ['onReveal', 'ongoing', 'endOfTurn', 'onCardPlayedHere', 'onDestroyed'] as const;

export type Trigger = (typeof TRIGGERS)[number];

export const abilitySchema = z
  .object({
    trigger: z.enum(TRIGGERS),
    condition: conditionSchema.optional(),
    // Only with onCardPlayedHere: which played cards trigger it (default: any other card, of any side).
    played: playedFilterSchema.optional(),
    target: targetSchema.default({ type: 'self' }),
    // One effect or a list, all applied in order to the same targets.
    effect: z
      .union([effectSchema, z.array(effectSchema).min(1)])
      .transform((effect) => (Array.isArray(effect) ? effect : [effect])),
  })
  .superRefine((ability, ctx) => {
    for (const issue of [...triggerIssues(ability), ...ongoingIssues(ability)]) {
      ctx.addIssue({ code: 'custom', ...issue });
    }
  });

interface Issue {
  path: string[];
  message: string;
}

function triggerIssues(ability: AbilityParams): Issue[] {
  const issues: Issue[] = [];
  if (ability.played !== undefined && ability.trigger !== 'onCardPlayedHere') {
    issues.push({ path: ['played'], message: '"played" only goes with the onCardPlayedHere trigger' });
  }
  if (ability.trigger === 'onDestroyed' && ability.target.type === 'self' && !isUntargeted(ability)) {
    issues.push({ path: ['target'], message: 'a destroyed card cannot target itself' });
  }
  return issues;
}

// Ongoing power is recomputed on every read: it must not depend on power nor on randomness.
function ongoingIssues(ability: AbilityParams): Issue[] {
  if (ability.trigger !== 'ongoing') {
    return [];
  }
  const issues = ability.effect
    .filter((effect) => !ONGOING_EFFECTS.has(effect.type))
    .map((effect) => ({ path: ['effect'], message: `effect "${effect.type}" cannot be ongoing` }));
  if (ability.target.type === 'cards' && ability.target.pick !== 'all') {
    issues.push({ path: ['target', 'pick'], message: 'an ongoing target must pick "all"' });
  }
  return issues;
}

export type AbilityParams = z.output<typeof abilitySchema>;

export interface CompiledAbility {
  readonly trigger: Trigger;
  readonly condition: Condition | null;
  readonly target: TargetSelector;
  readonly effects: readonly Effect[];
  // Kept for the text description.
  readonly params: AbilityParams;
}

export function compileAbility(params: AbilityParams): CompiledAbility {
  return {
    trigger: params.trigger,
    condition: params.condition === undefined ? null : createCondition(params.condition),
    target: createTarget(params.target),
    effects: params.effect.map(createEffect),
    params,
  };
}

export function isUntargeted(ability: AbilityParams): boolean {
  return ability.effect.every((effect) => UNTARGETED_EFFECTS.has(effect.type));
}

// A location belongs to nobody: "self", "ally" and "enemy" mean nothing there.
export function locationAbilityIssues(ability: AbilityParams): string[] {
  const issues = locationEffectIssues(ability);
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
  if (filters.some((filter) => filter.side !== 'all') || (ability.played ?? { side: 'all' }).side !== 'all') {
    issues.push('a location ability must use side "all"');
  }
  return issues;
}

function locationEffectIssues(ability: AbilityParams): string[] {
  const issues: string[] = [];
  if (ability.target.type === 'self' && !isUntargeted(ability)) {
    issues.push('a location ability cannot target "self"');
  }
  if (ability.trigger === 'onDestroyed') {
    issues.push('a location is never destroyed: no onDestroyed trigger');
  }
  if (ability.effect.some((effect) => effect.type === 'addToHand' && effect.card === undefined)) {
    issues.push('a location "addToHand" needs a "card" (there is no card to copy)');
  }
  return issues;
}
