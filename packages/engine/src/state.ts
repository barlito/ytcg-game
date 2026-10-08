import type { StatusId } from './abilities/statuses.ts';
import type { RngState } from './rng.ts';

export type PlayerIndex = 0 | 1;

export const PLAYERS: readonly PlayerIndex[] = [0, 1];

export function opponentOf(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

export type CardZone = 'deck' | 'hand' | 'pending' | 'board' | 'destroyed';

export interface CardInstance {
  uid: string;
  defId: string;
  owner: PlayerIndex;
  zone: CardZone;
  location: number | null;
  powerModifier: number;
  playOrder: number | null;
  // Status → stacks, only while on the board.
  statuses: Partial<Record<StatusId, number>>;
}

export interface PlayerState {
  id: string;
  deck: string[];
  hand: string[];
  pending: string[];
  energy: number;
  spent: number;
  ready: boolean;
  mulliganUsed: boolean;
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
  | { type: 'statusChanged'; card: string; status: StatusId; stacks: number }
  | { type: 'gameEnded'; result: GameResult };
