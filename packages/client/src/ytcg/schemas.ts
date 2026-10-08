import { z } from 'zod';

// Response shapes of the ytcg player API (contract: youl-tcg docs/duel-api.md).
export const ownedCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  extension: z.string(),
  rarity: z.string(),
  unique: z.boolean(),
  terrain: z.boolean(),
  tags: z.array(z.string()),
  quantity: z.number(),
  holoQuantity: z.number(),
});

export type OwnedCard = z.output<typeof ownedCardSchema>;

export const collectionSchema = z.object({ cards: z.array(ownedCardSchema) });

export const deckSchema = z.object({
  id: z.string(),
  name: z.string(),
  cards: z.array(z.string()),
  terrain: z.string().nullable(),
  valid: z.boolean(),
  missingCards: z.array(z.string()),
  issues: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Deck = z.output<typeof deckSchema>;

export const deckListSchema = z.object({ decks: z.array(deckSchema), maxDecks: z.number(), deckSize: z.number() });

export type DeckList = z.output<typeof deckListSchema>;

export const errorSchema = z.object({
  error: z.string(),
  loginUrl: z.string().optional(),
  violations: z.record(z.string(), z.array(z.string())).optional(),
});

export interface DeckPayload {
  name: string;
  cards: string[];
  terrain: string | null;
}
