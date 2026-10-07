import { z } from 'zod';
import type { Rng } from '../rng.ts';
import type { PlayerIndex } from '../state.ts';
import { type StatusId, statusSchema } from './statuses.ts';

export const tagSchema = z.string().regex(/^[a-z]+:[a-z0-9-]+$/, 'expected a "family:value" tag');

export const sideSchema = z.enum(['ally', 'enemy', 'all']);
export const scopeSchema = z.enum(['here', 'everywhere', 'elsewhere']);

export const cardFilterShape = {
  side: sideSchema.default('ally'),
  scope: scopeSchema.default('here'),
  tag: tagSchema.optional(),
  status: statusSchema.optional(),
  includeSelf: z.boolean().default(false),
};

export const cardFilterSchema = z.object(cardFilterShape);

export type CardFilter = z.output<typeof cardFilterSchema>;

// Where an ability comes from: a card (owner + card set) or a location (both null).
export interface AbilitySource {
  readonly owner: PlayerIndex | null;
  readonly location: number;
  readonly card: string | null;
}

// Read-only view of the board. Only revealed cards on the board exist for abilities.
export interface BoardView {
  readonly turn: number;
  cardsMatching(source: AbilitySource, filter: CardFilter): string[];
  power(card: string): number;
}

// What effects may do on top of reading.
export interface Board extends BoardView {
  readonly rng: Rng;
  addPower(card: string, delta: number): void;
  draw(player: PlayerIndex, count: number): void;
  destroy(card: string): void;
  addStatus(card: string, status: StatusId, stacks: number): void;
  // null removes every status.
  removeStatus(card: string, status: StatusId | null): void;
}

export interface Condition {
  isMet(board: BoardView, source: AbilitySource): boolean;
}

export interface TargetSelector {
  select(board: Board, source: AbilitySource): string[];
}

export interface Effect {
  apply(board: Board, source: AbilitySource, targets: readonly string[]): void;
}

// An effect allowed on an ongoing ability: its bonus is recomputed on every power read.
export interface OngoingEffect extends Effect {
  ongoingBonus(board: BoardView, source: AbilitySource): number;
}

export function isOngoingEffect(effect: Effect): effect is OngoingEffect {
  return 'ongoingBonus' in effect;
}
