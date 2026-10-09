import { z } from 'zod';
import type { Rng } from '../rng.ts';
import type { GameEvent, PlayerIndex } from '../state.ts';
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

// Which card played on a location triggers an onCardPlayedHere ability (side defaults to "all": any card).
export const playedFilterSchema = z.object({
  side: sideSchema.default('all'),
  tag: tagSchema.optional(),
  status: statusSchema.optional(),
});

export type PlayedFilter = z.output<typeof playedFilterSchema>;

// Where an ability comes from: a card (owner + card set) or a location (both null).
export interface AbilitySource {
  readonly owner: PlayerIndex | null;
  readonly location: number;
  readonly card: string | null;
  // The card that was just played, for the onCardPlayedHere trigger.
  readonly played?: string;
}

export const MOVE_DESTINATIONS = ['random', 'left', 'right'] as const;

export type MoveDestination = (typeof MOVE_DESTINATIONS)[number];

// Read-only view of the board. Only revealed cards on the board exist for abilities.
export interface BoardView {
  readonly turn: number;
  cardsMatching(source: AbilitySource, filter: CardFilter): string[];
  power(card: string): number;
  hasStatus(card: string, status: StatusId): boolean;
}

// What effects may do on top of reading.
export interface Board extends BoardView {
  readonly rng: Rng;
  // Adds an event that is not a state change by itself (announcements for the animation).
  recordEvent(event: GameEvent): void;
  addPower(card: string, delta: number): void;
  draw(player: PlayerIndex, count: number): void;
  destroy(card: string): void;
  addStatus(card: string, status: StatusId, stacks: number): void;
  // null removes every status.
  removeStatus(card: string, status: StatusId | null): void;
  // Moves a board card to another location of its side that has a free place; nothing happens without one.
  move(card: string, destination: MoveDestination): void;
  // Changes the cost of the cards in hand of a player (tag null = every card), or of the next card played.
  addHandCost(player: PlayerIndex, amount: number, tag: string | null): void;
  addNextCost(player: PlayerIndex, amount: number, tag: string | null): void;
  // Adds a new copy of a catalog card to the hand (nothing when the hand is full).
  // `from`: the card carrying the ability, when there is one (the animation flies the new card from it).
  addToHand(player: PlayerIndex, defId: string, from?: string): void;
  // A card just went mad: fires its onMad abilities, or draws its crisis when it has no madness effect of its own.
  becomeMad(card: string): void;
  // Id of the definition of a board card.
  defIdOf(card: string): string;
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
