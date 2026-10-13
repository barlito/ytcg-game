import { type Catalog, DECK_SIZE } from '@ytcg-game/engine';
import { gameRuleRefusal } from '@ytcg-game/server/deck-rules';
import type { Deck, DeckPayload } from '../ytcg/schemas.ts';
import { type CopyKind, playsHolo } from './copies.ts';

export interface DeckDraft {
  // null until the deck is saved for the first time.
  id: string | null;
  name: string;
  cards: string[];
  terrain: string | null;
  // Cards of `cards` played in their holo copy (the player's choice, only offered for owned holo copies).
  holoCards: string[];
}

export type DraftAction =
  | { type: 'rename'; name: string }
  | { type: 'toggle'; card: string }
  | { type: 'holo'; card: string }
  | { type: 'terrain'; terrain: string | null };

export const DECK_NAME_MAX = 40;

export function draftFrom(deck: Deck | null): DeckDraft {
  return deck === null
    ? { id: null, name: '', cards: [], terrain: null, holoCards: [] }
    : {
        id: deck.id,
        name: deck.name,
        cards: [...deck.cards],
        terrain: deck.terrain,
        holoCards: [...deck.holoCards],
      };
}

export function draftReducer(draft: DeckDraft, action: DraftAction): DeckDraft {
  switch (action.type) {
    case 'rename':
      return { ...draft, name: action.name.slice(0, DECK_NAME_MAX) };
    case 'terrain':
      return { ...draft, terrain: action.terrain };
    case 'holo':
      if (!draft.cards.includes(action.card)) {
        return draft;
      }
      return {
        ...draft,
        holoCards: draft.holoCards.includes(action.card)
          ? draft.holoCards.filter((id) => id !== action.card)
          : [...draft.holoCards, action.card],
      };
    case 'toggle':
      if (draft.cards.includes(action.card)) {
        return {
          ...draft,
          cards: draft.cards.filter((id) => id !== action.card),
          holoCards: draft.holoCards.filter((id) => id !== action.card),
        };
      }
      return draft.cards.length >= DECK_SIZE ? draft : { ...draft, cards: [...draft.cards, action.card] };
  }
}

// holoCards = what is played holo: forced for cards owned in holo only, the choice when both kinds are owned.
export function draftPayload(draft: DeckDraft, kinds: ReadonlyMap<string, CopyKind>): DeckPayload {
  return {
    name: draft.name.trim(),
    cards: draft.cards,
    terrain: draft.terrain,
    holoCards: draft.cards.filter((id) => playsHolo(kinds.get(id), draft.holoCards.includes(id))),
  };
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
