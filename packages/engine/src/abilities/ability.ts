import { z } from 'zod';
import type { CardFilter, Condition, Effect, TargetSelector } from './board.ts';
import { conditionSchema, createCondition } from './conditions.ts';
import { ONGOING_EFFECTS, UNTARGETED_EFFECTS, createEffect, effectSchema } from './effects.ts';
import { createTarget, targetSchema } from './targets.ts';

export const TRIGGERS = ['onReveal', 'ongoing', 'endOfTurn'] as const;

export type Trigger = (typeof TRIGGERS)[number];

export const abilitySchema = z
  .object({
    trigger: z.enum(TRIGGERS),
    condition: conditionSchema.optional(),
    target: targetSchema.default({ type: 'self' }),
    effect: effectSchema,
  })
  .superRefine((ability, ctx) => {
    if (ability.trigger !== 'ongoing') {
      return;
    }
    // Ongoing power is recomputed on every read: it must not depend on power nor on randomness.
    if (!ONGOING_EFFECTS.has(ability.effect.type)) {
      ctx.addIssue({ code: 'custom', path: ['effect'], message: `effect "${ability.effect.type}" cannot be ongoing` });
    }
    if (ability.target.type === 'cards' && ability.target.pick !== 'all') {
      ctx.addIssue({ code: 'custom', path: ['target', 'pick'], message: 'an ongoing target must pick "all"' });
    }
  });

export type AbilityParams = z.output<typeof abilitySchema>;

export interface CompiledAbility {
  readonly trigger: Trigger;
  readonly condition: Condition | null;
  readonly target: TargetSelector;
  readonly effect: Effect;
}

export function compileAbility(params: AbilityParams): CompiledAbility {
  return {
    trigger: params.trigger,
    condition: params.condition === undefined ? null : createCondition(params.condition),
    target: createTarget(params.target),
    effect: createEffect(params.effect),
  };
}

// A location belongs to nobody: "self", "ally" and "enemy" mean nothing there.
export function locationAbilityIssues(ability: AbilityParams): string[] {
  const issues: string[] = [];
  if (ability.target.type === 'self' && !UNTARGETED_EFFECTS.has(ability.effect.type)) {
    issues.push('a location ability cannot target "self"');
  }
  const filters: CardFilter[] = [];
  if (ability.target.type === 'cards') {
    filters.push(ability.target);
  }
  if (ability.condition?.type === 'count') {
    filters.push(ability.condition);
  }
  if (ability.effect.type === 'addPowerPerCard') {
    filters.push(ability.effect.count);
  }
  if (filters.some((filter) => filter.side !== 'all')) {
    issues.push('a location ability must use side "all"');
  }
  return issues;
}
