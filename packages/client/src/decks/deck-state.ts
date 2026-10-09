import { type Catalog, DECK_SIZE, deckCurveChecks } from '@ytcg-game/engine';
import { gameRuleRefusal } from '@ytcg-game/server/deck-rules';
import type { Deck } from '../ytcg/schemas.ts';

export type DeckState =
  | { kind: 'ready' }
  // ytcg: cards sold, traded or recycled since.
  | { kind: 'incomplete'; text: string }
  // The game rules (curve, cards unknown to the game): the server would refuse it.
  | { kind: 'rules'; text: string };

export function deckState(catalog: Catalog, deck: Deck): DeckState {
  if (!deck.valid) {
    const missing = deck.missingCards.length;
    const text =
      missing === 0
        ? (deck.issues[0] ?? 'Incomplet')
        : `${missing} carte${missing > 1 ? 's' : ''} manquante${missing > 1 ? 's' : ''}`;
    return { kind: 'incomplete', text };
  }
  const choice = deck.terrain === null ? { cards: deck.cards } : { cards: deck.cards, location: deck.terrain };
  const refusal = gameRuleRefusal(catalog, choice);
  return refusal === null ? { kind: 'ready' } : { kind: 'rules', text: refusal };
}

export interface DeckBadge {
  label: string;
  ok: boolean;
  // The engine's reason when the game rules refuse the deck.
  detail: string | null;
}

// A short reason for the pill; the engine's full sentence stays in the tooltip.
function refusalLabel(catalog: Catalog, deck: Deck): string {
  if (deck.cards.some((id) => !catalog.cards.has(id))) {
    return 'Cartes injouables';
  }
  if (deck.terrain !== null && !catalog.locations.has(deck.terrain)) {
    return 'Terrain injouable';
  }
  if (new Set(deck.cards).size !== DECK_SIZE || deck.cards.length !== DECK_SIZE) {
    return `${String(DECK_SIZE)} cartes exactement`;
  }
  const known = deck.cards.filter((id) => catalog.cards.has(id));
  return deckCurveChecks(catalog, known).some((check) => !check.ok) ? 'Courbe de coûts' : 'Deck refusé';
}

// Short status of a deck tile: green « Jouable », or the reason in yellow.
export function deckBadge(catalog: Catalog, deck: Deck): DeckBadge {
  const state = deckState(catalog, deck);
  if (state.kind === 'ready') {
    return { label: 'Jouable', ok: true, detail: null };
  }
  if (state.kind === 'rules') {
    return { label: refusalLabel(catalog, deck), ok: false, detail: state.text };
  }
  const missing = deck.missingCards.length;
  const label =
    missing === 0 ? state.text : `${String(missing)} carte${missing > 1 ? 's' : ''} manque${missing > 1 ? 'nt' : ''}`;
  return { label, ok: false, detail: null };
}

// The deck to play: the chosen one while it is playable, else the first playable one.
export function playableDeckId(catalog: Catalog, decks: readonly Deck[], chosen: string | null): string | null {
  const playable = decks.filter((deck) => deckState(catalog, deck).kind === 'ready').map((deck) => deck.id);
  return chosen !== null && playable.includes(chosen) ? chosen : (playable[0] ?? null);
}
