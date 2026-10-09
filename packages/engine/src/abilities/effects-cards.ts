import { z } from 'zod';
import { PLAYERS, type PlayerIndex } from '../state.ts';
import { type AbilitySource, type Board, type Effect, MOVE_DESTINATIONS, tagSchema } from './board.ts';

// Effects that move cards around or touch the hand. A location has no owner: both players are concerned.
export function owners(source: AbilitySource): readonly PlayerIndex[] {
  return source.owner === null ? PLAYERS : [source.owner];
}

const moveSchema = z.object({
  type: z.literal('move'),
  // random: any other location of the card's side with a free place; left / right: the adjacent one only.
  destination: z.enum(MOVE_DESTINATIONS).default('random'),
});

export class MoveEffect implements Effect {
  static readonly schema = moveSchema;
  private readonly params: z.output<typeof moveSchema>;

  constructor(params: z.output<typeof moveSchema>) {
    this.params = params;
  }

  apply(board: Board, _source: AbilitySource, targets: readonly string[]): void {
    for (const target of targets) {
      board.move(target, this.params.destination);
    }
  }
}

const addCostSchema = z.object({
  type: z.literal('addCost'),
  // Negative = cheaper. A cost never goes below 0.
  amount: z
    .number()
    .int()
    .refine((amount) => amount !== 0, 'amount must not be 0'),
  // hand: every card in hand now. next: the next card played (any card, or the first matching `tag`).
  cards: z.enum(['hand', 'next']).default('hand'),
  tag: tagSchema.optional(),
});

export class AddCostEffect implements Effect {
  static readonly schema = addCostSchema;
  private readonly params: z.output<typeof addCostSchema>;

  constructor(params: z.output<typeof addCostSchema>) {
    this.params = params;
  }

  apply(board: Board, source: AbilitySource): void {
    const { amount, cards, tag } = this.params;
    for (const player of owners(source)) {
      if (cards === 'hand') {
        board.addHandCost(player, amount, tag ?? null);
      } else {
        board.addNextCost(player, amount, tag ?? null);
      }
    }
  }
}

const addToHandSchema = z.object({
  type: z.literal('addToHand'),
  // Catalog card id; absent = a copy of the card carrying the ability.
  card: z.string().min(1).optional(),
  count: z.number().int().min(1).max(3).default(1),
});

export class AddToHandEffect implements Effect {
  static readonly schema = addToHandSchema;
  private readonly params: z.output<typeof addToHandSchema>;

  constructor(params: z.output<typeof addToHandSchema>) {
    this.params = params;
  }

  apply(board: Board, source: AbilitySource): void {
    const defId = this.params.card ?? (source.card === null ? null : board.defIdOf(source.card));
    if (defId === null) {
      return;
    }
    for (const player of owners(source)) {
      for (let i = 0; i < this.params.count; i++) {
        board.addToHand(player, defId);
      }
    }
  }
}
