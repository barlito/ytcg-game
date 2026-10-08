import type { PlayerEvent, PlayerIndex, PlayerView } from '@ytcg-game/engine';
import { z } from 'zod';

export * from './messages.ts';

// Client → server. The player index is never sent: the server knows who is speaking.
export const actionInputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('play'), card: z.string().min(1), location: z.number().int().min(0) }),
  z.object({ type: z.literal('cancel'), card: z.string().min(1) }),
  z.object({ type: z.literal('endTurn') }),
  z.object({ type: z.literal('mulligan') }),
]);

export type ActionInput = z.output<typeof actionInputSchema>;

// Options sent when creating or joining a room. Authentication itself comes from the ytcg cookie in production.
// 12 cards plus, optionally, a location card the player owns (none: a random location takes its place).
export const deckChoiceSchema = z.object({
  cards: z.array(z.string().min(1)).max(50),
  location: z.string().min(1).optional(),
});

export type DeckChoice = z.output<typeof deckChoiceSchema>;

// Production: a reference to one of the player's ytcg decks, nothing else (strict: an inline deck is refused).
export const deckRefOptionsSchema = z.strictObject({
  deckId: z.string().regex(/^[\w-]{1,64}$/),
});

export type DeckRefOptions = z.output<typeof deckRefOptionsSchema>;

// Development only (src/dev.ts): a free pseudo and an inline deck checked against the catalog.
export const devJoinOptionsSchema = z.object({
  deck: deckChoiceSchema,
  name: z.string().trim().min(1).max(30).optional(),
});

export type DevJoinOptions = z.output<typeof devJoinOptionsSchema>;

export type JoinOptions = DeckRefOptions | DevJoinOptions;

// Server → client.
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
  // Server clock (epoch ms) when the message was sent: clients convert the deadlines to their own clock.
  serverTime: number;
  turnDeadline: number | null;
  // Epoch milliseconds at which the reading pause after a reveal ends (the turn timer runs after it), else null.
  revealUntil: number | null;
  outcome: Outcome | null;
}

export interface ErrorMessage {
  code: string;
  message: string;
}
