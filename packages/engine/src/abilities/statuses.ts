import { z } from 'zod';
import type { Board } from './board.ts';

// A status is a marker put on a board card during the game, with optional rules of its own.
// A new rule is a new entry here (and tests): the hooks below are the only places the engine reads.
export interface StatusRule {
  // Display names: the noun (keyword) and the adjective agreeing with « carte ».
  readonly name: string;
  readonly adjective: string;
  readonly rule?: string;
  // Permanent immunities (Coriace).
  readonly preventsDestroy?: boolean;
  readonly preventsPowerLoss?: boolean;
  // One-shot shields: each stack cancels one destruction / one power loss, then goes away (Protégée).
  readonly absorbsDestroy?: boolean;
  readonly absorbsPowerLoss?: boolean;
  endOfTurn?(board: Board, card: string, stacks: number): void;
  // Right after the card got this status while it had none.
  onGained?(board: Board, card: string): void;
  // Right after the stacks of this status increased.
  onStacksChanged?(board: Board, card: string, stacks: number): void;
}

// Stacks at which a card in overheat is destroyed.
export const OVERHEAT_LIMIT = 3;

// Folie (`mad`) is a state with no rule of its own: what it does comes from the card (`mad` condition, `onMad`
// trigger) or from a crisis drawn when the card has nothing defined (`crises.ts`).
export const STATUSES = {
  mad: {
    name: 'Folie',
    adjective: 'folle',
    onGained(board: Board, card: string): void {
      board.becomeMad(card);
    },
  },
  high: {
    name: 'Défonce',
    adjective: 'défoncée',
    rule: 'perd 1 puissance par cumul à chaque fin de tour',
    endOfTurn(board: Board, card: string, stacks: number): void {
      board.addPower(card, -stacks);
    },
  },
  tough: {
    name: 'Coriace',
    adjective: 'coriace',
    rule: 'ne peut être ni détruite ni affaiblie',
    preventsDestroy: true,
    preventsPowerLoss: true,
  },
  drunk: {
    name: 'Ivresse',
    adjective: 'ivre',
    rule: 'gagne ou perd 2 puissance au hasard par cumul à chaque fin de tour',
    endOfTurn(board: Board, card: string, stacks: number): void {
      for (let i = 0; i < stacks; i++) {
        board.addPower(card, board.rng.int(2) === 0 ? 2 : -2);
      }
    },
  },
  protected: {
    name: 'Protection',
    adjective: 'protégée',
    rule: 'annule la prochaine destruction ou le prochain malus de puissance, puis disparaît (un cumul par protection)',
    absorbsDestroy: true,
    absorbsPowerLoss: true,
  },
  overheat: {
    name: 'Surchauffe',
    adjective: 'surchauffée',
    rule: `détruite dès ${OVERHEAT_LIMIT} cumuls`,
    onStacksChanged(board: Board, card: string, stacks: number): void {
      if (stacks >= OVERHEAT_LIMIT) {
        board.destroy(card);
      }
    },
    // A card that survived (Coriace, Protection) is tried again every turn.
    endOfTurn(board: Board, card: string, stacks: number): void {
      if (stacks >= OVERHEAT_LIMIT) {
        board.destroy(card);
      }
    },
  },
} as const satisfies Record<string, StatusRule>;

export type StatusId = keyof typeof STATUSES;

export const STATUS_IDS = Object.keys(STATUSES) as [StatusId, ...StatusId[]];

export const statusSchema = z.enum(STATUS_IDS);

export function statusRule(status: StatusId): StatusRule {
  return STATUSES[status];
}
