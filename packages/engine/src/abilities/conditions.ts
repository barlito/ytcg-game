import { z } from 'zod';
import { type AbilitySource, type BoardView, type CardFilter, type Condition, cardFilterShape } from './board.ts';
import { MAX_TURNS } from '../rules.ts';
import { statusSchema } from './statuses.ts';

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

const statusConditionSchema = z.object({ type: z.literal('status'), status: statusSchema });

// This card has the status (never true for a location).
export class StatusCondition implements Condition {
  static readonly schema = statusConditionSchema;
  private readonly params: z.output<typeof statusConditionSchema>;

  constructor(params: z.output<typeof statusConditionSchema>) {
    this.params = params;
  }

  isMet(board: BoardView, source: AbilitySource): boolean {
    return source.card !== null && board.hasStatus(source.card, this.params.status);
  }
}

const turnsOnBoardSchema = z.object({
  type: z.literal('turnsOnBoard'),
  min: z
    .number()
    .int()
    .min(1)
    .max(MAX_TURNS - 1),
});

// This card was revealed at least `min` turns ago (never true for a location).
export class TurnsOnBoardCondition implements Condition {
  static readonly schema = turnsOnBoardSchema;
  private readonly params: z.output<typeof turnsOnBoardSchema>;

  constructor(params: z.output<typeof turnsOnBoardSchema>) {
    this.params = params;
  }

  isMet(board: BoardView, source: AbilitySource): boolean {
    return source.card !== null && board.turnsOnBoard(source.card) >= this.params.min;
  }
}

const locationConditionSchema = z.object({
  type: z.literal('location'),
  // The owner of the card, at the location of the card.
  result: z.enum(['winning', 'losing', 'tied']),
});

const HERE_ALLY: CardFilter = { side: 'ally', scope: 'here', includeSelf: true };
const HERE_ENEMY: CardFilter = { side: 'enemy', scope: 'here', includeSelf: false };

// Reads power: never on an ongoing ability (power would depend on itself), never on a location (no owner).
export class LocationCondition implements Condition {
  static readonly schema = locationConditionSchema;
  private readonly params: z.output<typeof locationConditionSchema>;

  constructor(params: z.output<typeof locationConditionSchema>) {
    this.params = params;
  }

  isMet(board: BoardView, source: AbilitySource): boolean {
    if (source.owner === null) {
      return false;
    }
    const total = (filter: CardFilter): number =>
      board.cardsMatching(source, filter).reduce((sum, uid) => sum + board.power(uid), 0);
    const lead = Math.sign(total(HERE_ALLY) - total(HERE_ENEMY));
    return lead === { winning: 1, losing: -1, tied: 0 }[this.params.result];
  }
}

export const conditionSchema = z.discriminatedUnion('type', [
  CountCondition.schema,
  TurnCondition.schema,
  StatusCondition.schema,
  LocationCondition.schema,
  TurnsOnBoardCondition.schema,
]);

export type ConditionParams = z.output<typeof conditionSchema>;

export function createCondition(params: ConditionParams): Condition {
  switch (params.type) {
    case 'count':
      return new CountCondition(params);
    case 'turn':
      return new TurnCondition(params);
    case 'status':
      return new StatusCondition(params);
    case 'location':
      return new LocationCondition(params);
    case 'turnsOnBoard':
      return new TurnsOnBoardCondition(params);
  }
}
