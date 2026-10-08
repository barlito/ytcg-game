import { type Catalog, DECK_SIZE } from '@ytcg-game/engine';
import { gameRuleRefusal } from '@ytcg-game/server/deck-rules';
import type { Deck, DeckPayload } from '../ytcg/schemas.ts';

export interface DeckDraft {
  // null until the deck is saved for the first time.
  id: string | null;
  name: string;
  cards: string[];
  terrain: string | null;
}

export type DraftAction =
  { type: 'rename'; name: string } | { type: 'toggle'; card: string } | { type: 'terrain'; terrain: string | null };

export const DECK_NAME_MAX = 40;

export function draftFrom(deck: Deck | null): DeckDraft {
  return deck === null
    ? { id: null, name: '', cards: [], terrain: null }
    : { id: deck.id, name: deck.name, cards: [...deck.cards], terrain: deck.terrain };
}

export function draftReducer(draft: DeckDraft, action: DraftAction): DeckDraft {
  switch (action.type) {
    case 'rename':
      return { ...draft, name: action.name.slice(0, DECK_NAME_MAX) };
    case 'terrain':
      return { ...draft, terrain: action.terrain };
    case 'toggle':
      if (draft.cards.includes(action.card)) {
        return { ...draft, cards: draft.cards.filter((id) => id !== action.card) };
      }
      return draft.cards.length >= DECK_SIZE ? draft : { ...draft, cards: [...draft.cards, action.card] };
  }
}

export function draftPayload(draft: DeckDraft): DeckPayload {
  return { name: draft.name.trim(), cards: draft.cards, terrain: draft.terrain };
}

export interface DraftStatus {
  full: boolean;
  canSave: boolean;
  // The refusal the game server would give for this deck (same function), null when playable.
  gameRefusal: string | null;
}

export function draftStatus(catalog: Catalog, draft: DeckDraft): DraftStatus {
  const full = draft.cards.length === DECK_SIZE;
  const deck = draft.terrain === null ? { cards: draft.cards } : { cards: draft.cards, location: draft.terrain };
  return {
    full,
    canSave: full && draft.name.trim() !== '',
    gameRefusal: full ? gameRuleRefusal(catalog, deck) : null,
  };
}
