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
    // One effect or a list, all applied in order to the same targets.
    effect: z
      .union([effectSchema, z.array(effectSchema).min(1)])
      .transform((effect) => (Array.isArray(effect) ? effect : [effect])),
  })
  .superRefine((ability, ctx) => {
    if (ability.trigger !== 'ongoing') {
      return;
    }
    // Ongoing power is recomputed on every read: it must not depend on power nor on randomness.
    for (const effect of ability.effect) {
      if (!ONGOING_EFFECTS.has(effect.type)) {
        ctx.addIssue({ code: 'custom', path: ['effect'], message: `effect "${effect.type}" cannot be ongoing` });
      }
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
  const issues: string[] = [];
  if (ability.target.type === 'self' && !isUntargeted(ability)) {
    issues.push('a location ability cannot target "self"');
  }
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
  if (filters.some((filter) => filter.side !== 'all')) {
    issues.push('a location ability must use side "all"');
  }
  return issues;
}
