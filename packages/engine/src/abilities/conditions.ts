import { z } from 'zod';
import { type AbilitySource, type BoardView, type Condition, cardFilterShape } from './board.ts';
import { MAX_TURNS } from '../rules.ts';

const countSchema = z.object({
  type: z.literal('count'),
  ...cardFilterShape,
  min: z.number().int().min(0).default(1),
  max: z.number().int().min(0).optional(),
});

export class CountCondition implements Condition {
  static readonly schema = countSchema;
  private readonly params: z.output<typeof countSchema>;

  constructor(params: z.output<typeof countSchema>) {
    this.params = params;
  }

  isMet(board: BoardView, source: AbilitySource): boolean {
    const count = board.cardsMatching(source, this.params).length;
    return count >= this.params.min && (this.params.max === undefined || count <= this.params.max);
  }
}

const turnSchema = z.object({
  type: z.literal('turn'),
  min: z.number().int().min(1).max(MAX_TURNS).optional(),
  max: z.number().int().min(1).max(MAX_TURNS).optional(),
});

export class TurnCondition implements Condition {
  static readonly schema = turnSchema;
  private readonly params: z.output<typeof turnSchema>;

  constructor(params: z.output<typeof turnSchema>) {
    this.params = params;
  }

  isMet(board: BoardView): boolean {
    const { min, max } = this.params;
    return (min === undefined || board.turn >= min) && (max === undefined || board.turn <= max);
  }
}

export const conditionSchema = z.discriminatedUnion('type', [CountCondition.schema, TurnCondition.schema]);

export type ConditionParams = z.output<typeof conditionSchema>;

export function createCondition(params: ConditionParams): Condition {
  switch (params.type) {
    case 'count':
      return new CountCondition(params);
    case 'turn':
      return new TurnCondition(params);
  }
}
