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
  // Printed cost of the card definition.
  minCost: z.number().int().min(0).optional(),
  maxCost: z.number().int().min(0).optional(),
  // Current power: reads power, so never inside an ongoing ability.
  minPower: z.number().int().optional(),
  maxPower: z.number().int().optional(),
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

// Who applies a change: a card and its owner, or a terrain (both null).
export type Origin = Pick<AbilitySource, 'owner' | 'card'>;

export const MOVE_DESTINATIONS = ['random', 'left', 'right'] as const;

export type MoveDestination = (typeof MOVE_DESTINATIONS)[number];

// Read-only view of the board. Only revealed cards on the board exist for abilities.
export interface BoardView {
  readonly turn: number;
  cardsMatching(source: AbilitySource, filter: CardFilter): string[];
  power(card: string): number;
  hasStatus(card: string, status: StatusId): boolean;
  hasTag(card: string, tag: string): boolean;
  // Turns started since the card was revealed (0 on its reveal turn).
  turnsOnBoard(card: string): number;
}

// What effects may do on top of reading.
export interface Board extends BoardView {
  readonly rng: Rng;
  // Adds an event that is not a state change by itself (announcements for the animation).
  recordEvent(event: GameEvent): void;
  // Returns the change really applied (0 when Coriace or Protection stopped a loss, or Enragée an ally gain).
  // `by`: the card giving it, when an ability does (absent: the card's own status or madness).
  addPower(card: string, delta: number, by?: Origin): number;
  draw(player: PlayerIndex, count: number): void;
  destroy(card: string): void;
  // `by`: the card applying it and its owner (both null for a terrain); a Protection absorbs a status put by the
  // enemy, a charm lasts while its card is on the board.
  addStatus(card: string, status: StatusId, stacks: number, by: Origin): void;
  // null removes every status.
  removeStatus(card: string, status: StatusId | null): void;
  // One stack of the status wears off (gone at zero).
  loseStack(card: string, status: StatusId): void;
  // Moves a board card to another location of its side that has a free place; nothing happens without one.
  move(card: string, destination: MoveDestination): void;
  // Changes the cost of the cards in hand of a player (tag null = every card), or of the next card played.
  addHandCost(player: PlayerIndex, amount: number, tag: string | null): void;
  addNextCost(player: PlayerIndex, amount: number, tag: string | null): void;
  // Adds a new copy of a catalog card to the hand (nothing when the hand is full).
  // `from`: the card carrying the ability, when there is one (the animation flies the new card from it).
  addToHand(player: PlayerIndex, defId: string, from?: string): void;
  // The onReveal abilities of the last other allied card revealed at the source's location run for the source.
  copyReveal(source: AbilitySource): void;
  // A card following the default rule of Folie just went mad: draws its crisis.
  startCrisis(card: string): void;
  // The card takes the definition `into` (its evolved form), at most once per resolution.
  transform(card: string, into: string): void;
  ownerOf(card: string): PlayerIndex;
  // Id of the definition the card was played as (before any transformation): what a copy of it is.
  printedDefIdOf(card: string): string;
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
