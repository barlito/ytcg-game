import { z } from 'zod';

const playerSchema = z.union([z.literal(0), z.literal(1)]);
const cardSchema = z.string().min(1);

// Validates actions coming from the network before they reach the engine.
export const gameActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('play'), player: playerSchema, card: cardSchema, location: z.number().int().min(0) }),
  z.object({ type: z.literal('cancel'), player: playerSchema, card: cardSchema }),
  z.object({ type: z.literal('endTurn'), player: playerSchema }),
  z.object({ type: z.literal('mulligan'), player: playerSchema }),
]);

export type GameAction = z.output<typeof gameActionSchema>;
