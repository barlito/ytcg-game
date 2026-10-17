import { z } from 'zod';
import type { AbilitySource, Board, BoardView, Effect, OngoingEffect } from './board.ts';
import { statusSchema } from './statuses.ts';

const stealPowerSchema = z.object({
  type: z.literal('stealPower'),
  amount: z.number().int().min(1),
});

// The targets lose `amount`; the card carrying the ability gains what was really lost (Coriace, Protection: nothing).
export class StealPowerEffect implements Effect {
  static readonly schema = stealPowerSchema;
  private readonly params: z.output<typeof stealPowerSchema>;

  constructor(params: z.output<typeof stealPowerSchema>) {
    this.params = params;
  }

  apply(board: Board, source: AbilitySource, targets: readonly string[]): void {
    if (source.card === null) {
      return;
    }
    const stolen = targets
      .filter((target) => target !== source.card)
      .reduce((sum, target) => sum - board.addPower(target, -this.params.amount), 0);
    if (stolen > 0) {
      board.addPower(source.card, stolen, source);
    }
  }
}

const addPowerPerStackSchema = z.object({
  type: z.literal('addPowerPerStack'),
  amount: z
    .number()
    .int()
    .refine((amount) => amount !== 0, 'amount must not be 0'),
  status: statusSchema,
});

// `amount` per stack of `status` on the card carrying the ability (target "self" only): plain state, ongoing-safe.
export class AddPowerPerStackEffect implements OngoingEffect {
  static readonly schema = addPowerPerStackSchema;
  private readonly params: z.output<typeof addPowerPerStackSchema>;

  constructor(params: z.output<typeof addPowerPerStackSchema>) {
    this.params = params;
  }

  apply(board: Board, source: AbilitySource, targets: readonly string[]): void {
    const bonus = this.ongoingBonus(board, source);
    if (bonus === 0) {
      return;
    }
    for (const target of targets) {
      board.addPower(target, bonus, source);
    }
  }

  ongoingBonus(board: BoardView, source: AbilitySource): number {
    return source.card === null ? 0 : this.params.amount * board.stacksOf(source.card, this.params.status);
  }
}
