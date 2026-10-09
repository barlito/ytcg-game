import type { CrisisId } from './abilities/crises.ts';
import type { StatusId } from './abilities/statuses.ts';
import type { RngState } from './rng.ts';

export type PlayerIndex = 0 | 1;

export const PLAYERS: readonly PlayerIndex[] = [0, 1];

export function opponentOf(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

export type CardZone = 'deck' | 'hand' | 'pending' | 'board' | 'destroyed';

// A cost change: `tag` null = any card.
export interface CostModifier {
  amount: number;
  tag: string | null;
}

export interface CardInstance {
  uid: string;
  defId: string;
  owner: PlayerIndex;
  zone: CardZone;
  location: number | null;
  powerModifier: number;
  playOrder: number | null;
  // Cost change received while in hand (the effective cost never goes below 0).
  costModifier: number;
  // Set while the card is pending: what it cost, and the "next card" discounts it consumed (given back on cancel).
  paidCost: number | null;
  usedNextCosts: CostModifier[];
  // Status → stacks, only while on the board.
  statuses: Partial<Record<StatusId, number>>;
  // Drawn when the card goes mad without a madness effect of its own, forgotten with the Folie.
  crisis: CrisisId | null;
}

export interface PlayerState {
  id: string;
  deck: string[];
  hand: string[];
  pending: string[];
  // Cost changes waiting for the next card played (consumed by the first matching card).
  nextCosts: CostModifier[];
  energy: number;
  spent: number;
  ready: boolean;
  mulliganUsed: boolean;
}

// Properties of a location read by the rules (not one-shot effects). Only active once the location is revealed.
export interface LocationRules {
  // Cards per player (default LOCATION_CAPACITY).
  capacity?: number | undefined;
  // No card can be played here from this turn on.
  closedFromTurn?: number | undefined;
  // No card can be played here before this turn.
  openFromTurn?: number | undefined;
}

export interface LocationState {
  defId: string;
  // The player whose location card it is, null for the random one.
  chosenBy: PlayerIndex | null;
  revealed: boolean;
  cards: [string[], string[]];
}

export interface GameResult {
  winner: PlayerIndex | null;
  locationWinners: (PlayerIndex | null)[];
  locationPowers: [number, number][];
  totalPower: [number, number];
}

export interface GameState {
  seed: string;
  rng: RngState;
  turn: number;
  status: 'playing' | 'ended';
  players: [PlayerState, PlayerState];
  locations: LocationState[];
  cards: Record<string, CardInstance>;
  nextPlayOrder: number;
  result: GameResult | null;
}

export type GameEvent =
  | { type: 'turnStarted'; turn: number }
  | { type: 'locationRevealed'; location: number }
  | { type: 'cardDrawn'; player: PlayerIndex; card: string }
  | { type: 'handRedrawn'; player: PlayerIndex }
  | { type: 'revealPriority'; player: PlayerIndex }
  | { type: 'cardRevealed'; card: string; defId: string; player: PlayerIndex; location: number }
  | { type: 'powerChanged'; card: string; delta: number }
  | { type: 'cardDestroyed'; card: string }
  | { type: 'cardMoved'; card: string; from: number; to: number }
  // Private to the owner: the opponent never receives it. `card` null = the next card played.
  | { type: 'costChanged'; player: PlayerIndex; card: string | null; delta: number }
  | { type: 'cardAddedToHand'; player: PlayerIndex; card: string; defId: string }
  | { type: 'statusChanged'; card: string; status: StatusId; stacks: number }
  | { type: 'crisisStarted'; card: string; crisis: CrisisId }
  | { type: 'gameEnded'; result: GameResult };
