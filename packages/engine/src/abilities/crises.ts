import { z } from 'zod';
import type { AbilitySource, Board, BoardView, CardFilter } from './board.ts';

// A crisis is the madness of a card that has no madness effect of its own: drawn once when the card goes mad
// (seeded RNG), stored on the card, visible to both players. Tuning the pool = editing this table.
export interface CrisisRule {
  readonly name: string;
  // French rule text shown in the tooltip.
  readonly description: string;
  // Permanent ongoing power while the card is mad (negative = a malus: Coriace blocks it).
  readonly ongoing?: number;
  endOfTurn?(board: Board, source: AbilitySource): void;
}

// Power given to the other mad cards by an imploding card.
export const IMPLOSION_BONUS = 2;

const HERE: CardFilter = { side: 'all', scope: 'here', includeSelf: false };

// Other cards at the location of the source, split by madness.
function neighbours(board: BoardView, source: AbilitySource): { mad: string[]; sane: string[] } {
  const mad = board.cardsMatching(source, { ...HERE, status: 'mad' });
  return { mad, sane: board.cardsMatching(source, HERE).filter((uid) => !mad.includes(uid)) };
}

export const CRISES = {
  rage: { name: 'Rage', description: 'En continu : +2 puissance.', ongoing: 2 },
  delirium: { name: 'Délire', description: 'En continu : −2 puissance.', ongoing: -2 },
  wandering: {
    name: 'Errance',
    description: 'En fin de tour : se déplace vers un autre lieu au hasard.',
    endOfTurn(board: Board, source: AbilitySource): void {
      if (source.card !== null) {
        board.move(source.card, 'random');
      }
    },
  },
  contagion: {
    name: 'Contagion',
    description: 'En fin de tour : rend folle une autre carte non folle ici au hasard.',
    endOfTurn(board: Board, source: AbilitySource): void {
      const { sane } = neighbours(board, source);
      if (sane.length > 0 && source.card !== null) {
        const target = board.rng.pick(sane);
        board.recordEvent({ type: 'contagionSpread', from: source.card, to: target });
        board.addStatus(target, 'mad', 1);
      }
    },
  },
  implosion: {
    name: 'Implosion',
    description: `En fin de tour : se détruit et donne +${IMPLOSION_BONUS} puissance aux autres cartes folles ici.`,
    endOfTurn(board: Board, source: AbilitySource): void {
      const { card } = source;
      if (card === null) {
        return;
      }
      const { mad } = neighbours(board, source);
      board.destroy(card);
      // Coriace or Protection kept it alive: no bonus.
      if (board.cardsMatching(source, { ...HERE, includeSelf: true }).includes(card)) {
        return;
      }
      for (const uid of mad) {
        board.addPower(uid, IMPLOSION_BONUS);
      }
    },
  },
} as const satisfies Record<string, CrisisRule>;

export type CrisisId = keyof typeof CRISES;

export const CRISIS_IDS = Object.keys(CRISES) as [CrisisId, ...CrisisId[]];

export const crisisSchema = z.enum(CRISIS_IDS);

export function crisisRule(crisis: CrisisId): CrisisRule {
  return CRISES[crisis];
}
