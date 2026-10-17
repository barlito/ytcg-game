import { z } from 'zod';
import type { AbilitySource, Board, Effect } from './board.ts';

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
