import { z } from 'zod';
import { type AbilitySource, type Board, type TargetSelector, cardFilterShape } from './board.ts';

const selfSchema = z.object({ type: z.literal('self') });

export class SelfTarget implements TargetSelector {
  static readonly schema = selfSchema;

  select(_board: Board, source: AbilitySource): string[] {
    return source.card === null ? [] : [source.card];
  }
}

const cardsSchema = z.object({
  type: z.literal('cards'),
  ...cardFilterShape,
  pick: z.enum(['all', 'random', 'weakest', 'strongest']).default('all'),
});

export class CardsTarget implements TargetSelector {
  static readonly schema = cardsSchema;
  private readonly params: z.output<typeof cardsSchema>;

  constructor(params: z.output<typeof cardsSchema>) {
    this.params = params;
  }

  select(board: Board, source: AbilitySource): string[] {
    const cards = board.cardsMatching(source, this.params);
    if (cards.length === 0) {
      return [];
    }
    switch (this.params.pick) {
      case 'all':
        return cards;
      case 'random':
        return [board.rng.pick(cards)];
      case 'weakest':
        return [extreme(board, cards, (a, b) => a < b)];
      case 'strongest':
        return [extreme(board, cards, (a, b) => a > b)];
    }
  }
}

// Ties keep the first card in board order, so the pick stays deterministic.
function extreme(board: Board, cards: readonly string[], better: (a: number, b: number) => boolean): string {
  let best = cards[0] as string;
  let bestPower = board.power(best);
  for (const card of cards.slice(1)) {
    const power = board.power(card);
    if (better(power, bestPower)) {
      best = card;
      bestPower = power;
    }
  }
  return best;
}

export const targetSchema = z.discriminatedUnion('type', [SelfTarget.schema, CardsTarget.schema]);

export type TargetParams = z.output<typeof targetSchema>;

export function createTarget(params: TargetParams): TargetSelector {
  switch (params.type) {
    case 'self':
      return new SelfTarget();
    case 'cards':
      return new CardsTarget(params);
  }
}
