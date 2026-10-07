import type { PlayerEvent, PlayerIndex, PlayerView } from '@ytcg-game/engine';
import { z } from 'zod';

export const ROOM_NAME = 'duel';

// Client → server. The player index is never sent: the server knows who is speaking.
export const MESSAGE_ACTION = 'action';

export const actionInputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('play'), card: z.string().min(1), location: z.number().int().min(0) }),
  z.object({ type: z.literal('cancel'), card: z.string().min(1) }),
  z.object({ type: z.literal('endTurn') }),
]);

export type ActionInput = z.output<typeof actionInputSchema>;

// Options sent when creating or joining a room. Authentication itself comes from the ytcg cookie in production.
export const joinOptionsSchema = z.object({
  deck: z.array(z.string().min(1)).max(50),
  name: z.string().trim().min(1).max(30).optional(),
});

export type JoinOptions = z.output<typeof joinOptionsSchema>;

// Server → client.
export const MESSAGE_LOBBY = 'lobby';
export const MESSAGE_GAME = 'game';
export const MESSAGE_ERROR = 'error';

export interface SeatInfo {
  name: string;
  connected: boolean;
}

export interface LobbyMessage {
  seats: SeatInfo[];
}

export type Outcome = { winner: PlayerIndex | null; reason: 'score' } | { winner: PlayerIndex; reason: 'forfeit' };

export interface GameMessage {
  seats: SeatInfo[];
  view: PlayerView;
  events: PlayerEvent[];
  // Epoch milliseconds at which the current turn is ended automatically, null once the game is over.
  turnDeadline: number | null;
  outcome: Outcome | null;
}

export interface ErrorMessage {
  code: string;
  message: string;
}
