import { z } from 'zod';
import {
  type AbilitySource,
  type Board,
  type BoardView,
  type Effect,
  type OngoingEffect,
  cardFilterSchema,
} from './board.ts';
import { AddCostEffect, AddToHandEffect, MoveEffect, owners } from './effects-cards.ts';
import { StealPowerEffect } from './effects-power.ts';
import { type StatusId, statusRule, statusSchema } from './statuses.ts';

const addPowerSchema = z.object({
  type: z.literal('addPower'),
  amount: z
    .number()
    .int()
    .refine((amount) => amount !== 0, 'amount must not be 0'),
});

export class AddPowerEffect implements OngoingEffect {
  static readonly schema = addPowerSchema;
  private readonly params: z.output<typeof addPowerSchema>;

  constructor(params: z.output<typeof addPowerSchema>) {
    this.params = params;
  }

  apply(board: Board, _source: AbilitySource, targets: readonly string[]): void {
    for (const target of targets) {
      board.addPower(target, this.params.amount);
    }
  }

  ongoingBonus(): number {
    return this.params.amount;
  }
}

const addPowerPerCardSchema = z.object({
  type: z.literal('addPowerPerCard'),
  amount: z
    .number()
    .int()
    .refine((amount) => amount !== 0, 'amount must not be 0'),
  count: cardFilterSchema,
});

export class AddPowerPerCardEffect implements OngoingEffect {
  static readonly schema = addPowerPerCardSchema;
  private readonly params: z.output<typeof addPowerPerCardSchema>;

  constructor(params: z.output<typeof addPowerPerCardSchema>) {
    this.params = params;
  }

  apply(board: Board, source: AbilitySource, targets: readonly string[]): void {
    const bonus = this.ongoingBonus(board, source);
    if (bonus === 0) {
      return;
    }
    for (const target of targets) {
      board.addPower(target, bonus);
    }
  }

  ongoingBonus(board: BoardView, source: AbilitySource): number {
    return this.params.amount * board.cardsMatching(source, this.params.count).length;
  }
}

const drawSchema = z.object({
  type: z.literal('draw'),
  count: z.number().int().min(1).max(3).default(1),
});

export class DrawEffect implements Effect {
  static readonly schema = drawSchema;
  private readonly params: z.output<typeof drawSchema>;

  constructor(params: z.output<typeof drawSchema>) {
    this.params = params;
  }

  // A location has no owner: both players draw.
  apply(board: Board, source: AbilitySource): void {
    for (const player of owners(source)) {
      board.draw(player, this.params.count);
    }
  }
}

const destroySchema = z.object({ type: z.literal('destroy') });

export class DestroyEffect implements Effect {
  static readonly schema = destroySchema;

  apply(board: Board, _source: AbilitySource, targets: readonly string[]): void {
    for (const target of targets) {
      board.destroy(target);
    }
  }
}

const addStatusSchema = z
  .object({
    type: z.literal('addStatus'),
    status: statusSchema,
    stacks: z.number().int().min(1).max(5).default(1),
    // Lifts the tag restriction of the status (Surchauffe: machines only by default).
    anyCard: z.boolean().default(false),
  })
  .refine(({ status, anyCard }) => !anyCard || statusRule(status).onlyTag !== undefined, {
    path: ['anyCard'],
    message: '"anyCard" only goes with a status restricted to a tag (overheat)',
  });

export class AddStatusEffect implements Effect {
  static readonly schema = addStatusSchema;
  private readonly params: z.output<typeof addStatusSchema>;

  constructor(params: z.output<typeof addStatusSchema>) {
    this.params = params;
  }

  apply(board: Board, source: AbilitySource, targets: readonly string[]): void {
    const { status, stacks, anyCard } = this.params;
    const tag = anyCard ? undefined : statusRule(status).onlyTag;
    for (const target of targets) {
      if (tag === undefined || board.hasTag(target, tag)) {
        board.addStatus(target, status, stacks, source.owner);
      }
    }
  }
}

const removeStatusSchema = z
  .object({
    type: z.literal('removeStatus'),
    // One status, a list, or neither (= every status).
    status: statusSchema.optional(),
    statuses: z.array(statusSchema).min(1).optional(),
  })
  .refine(({ status, statuses }) => status === undefined || statuses === undefined, {
    path: ['statuses'],
    message: 'use "status" or "statuses", not both',
  });

// The statuses an effect removes, null = all of them.
export function removedStatuses(params: z.output<typeof removeStatusSchema>): readonly StatusId[] | null {
  if (params.statuses !== undefined) {
    return [...new Set(params.statuses)];
  }
  return params.status === undefined ? null : [params.status];
}

export class RemoveStatusEffect implements Effect {
  static readonly schema = removeStatusSchema;
  private readonly params: z.output<typeof removeStatusSchema>;

  constructor(params: z.output<typeof removeStatusSchema>) {
    this.params = params;
  }

  apply(board: Board, _source: AbilitySource, targets: readonly string[]): void {
    const statuses = removedStatuses(this.params);
    for (const target of targets) {
      for (const status of statuses ?? [null]) {
        board.removeStatus(target, status);
      }
    }
  }
}

export const effectSchema = z.discriminatedUnion('type', [
  AddPowerEffect.schema,
  AddPowerPerCardEffect.schema,
  DrawEffect.schema,
  DestroyEffect.schema,
  AddStatusEffect.schema,
  RemoveStatusEffect.schema,
  MoveEffect.schema,
  AddCostEffect.schema,
  AddToHandEffect.schema,
  StealPowerEffect.schema,
]);

export type EffectParams = z.output<typeof effectSchema>;

export const ONGOING_EFFECTS: ReadonlySet<EffectParams['type']> = new Set(['addPower', 'addPowerPerCard']);

// Effects that ignore the target of their ability.
export const UNTARGETED_EFFECTS: ReadonlySet<EffectParams['type']> = new Set(['draw', 'addCost', 'addToHand']);

type OtherEffectParams = Extract<EffectParams, { type: 'move' | 'addCost' | 'addToHand' | 'stealPower' }>;

const OTHER_EFFECTS: ReadonlySet<EffectParams['type']> = new Set(['move', 'addCost', 'addToHand', 'stealPower']);

function isOtherEffect(params: EffectParams): params is OtherEffectParams {
  return OTHER_EFFECTS.has(params.type);
}

export function createEffect(params: EffectParams): Effect {
  if (isOtherEffect(params)) {
    return createOtherEffect(params);
  }
  switch (params.type) {
    case 'addPower':
      return new AddPowerEffect(params);
    case 'addPowerPerCard':
      return new AddPowerPerCardEffect(params);
    case 'draw':
      return new DrawEffect(params);
    case 'destroy':
      return new DestroyEffect();
    case 'addStatus':
      return new AddStatusEffect(params);
    case 'removeStatus':
      return new RemoveStatusEffect(params);
  }
}

function createOtherEffect(params: OtherEffectParams): Effect {
  switch (params.type) {
    case 'move':
      return new MoveEffect(params);
    case 'addCost':
      return new AddCostEffect(params);
    case 'addToHand':
      return new AddToHandEffect(params);
    case 'stealPower':
      return new StealPowerEffect(params);
  }
}
