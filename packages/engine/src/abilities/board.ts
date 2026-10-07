import { z } from 'zod';
import type { Rng } from '../rng.ts';
import type { PlayerIndex } from '../state.ts';

export const tagSchema = z.string().regex(/^[a-z]+:[a-z0-9-]+$/, 'expected a "family:value" tag');

export const sideSchema = z.enum(['ally', 'enemy', 'all']);
export const scopeSchema = z.enum(['here', 'everywhere', 'elsewhere']);

export const cardFilterShape = {
  side: sideSchema.default('ally'),
  scope: scopeSchema.default('here'),
  tag: tagSchema.optional(),
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

// What abilities may read and do. Only revealed cards on the board are visible to them.
export interface Board {
  readonly turn: number;
  readonly rng: Rng;
  cardsMatching(source: AbilitySource, filter: CardFilter): string[];
  power(card: string): number;
  addPower(card: string, delta: number): void;
  draw(player: PlayerIndex, count: number): void;
  destroy(card: string): void;
}

export interface Condition {
  isMet(board: Board, source: AbilitySource): boolean;
}

export interface TargetSelector {
  select(board: Board, source: AbilitySource): string[];
}

export interface Effect {
  apply(board: Board, source: AbilitySource, targets: readonly string[]): void;
  // Only effects allowed on an ongoing ability implement it.
  ongoingBonus?(board: Board, source: AbilitySource): number;
}
