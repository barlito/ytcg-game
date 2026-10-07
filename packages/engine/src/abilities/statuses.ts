import { z } from 'zod';
import type { Board } from './board.ts';

// A status is a marker put on a board card during the game, with optional rules of its own.
export interface StatusRule {
  // Display names: the noun (keyword) and the adjective agreeing with « carte ».
  readonly name: string;
  readonly adjective: string;
  readonly rule?: string;
  readonly preventsDestroy?: boolean;
  readonly preventsPowerLoss?: boolean;
  endOfTurn?(board: Board, card: string, stacks: number): void;
}

export const STATUSES = {
  mad: { name: 'Folie', adjective: 'folle' },
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
} as const satisfies Record<string, StatusRule>;

export type StatusId = keyof typeof STATUSES;

export const STATUS_IDS = Object.keys(STATUSES) as [StatusId, ...StatusId[]];

export const statusSchema = z.enum(STATUS_IDS);

export function statusRule(status: StatusId): StatusRule {
  return STATUSES[status];
}
