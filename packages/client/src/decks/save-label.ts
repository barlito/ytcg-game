import { type Catalog, DECK_SIZE } from '@ytcg-game/engine';
import { curveLines } from './curve.ts';
import type { DeckDraft, DraftStatus } from './draft.ts';

function plural(count: number): string {
  return `${String(count)} carte${count > 1 ? 's' : ''}`;
}

// The save button says why it is disabled: the engine's own rule text when the deck breaks one.
export function saveLabel(catalog: Catalog, draft: DeckDraft, status: DraftStatus, saving: boolean): string {
  if (saving) {
    return 'Enregistrement…';
  }
  if (!status.full) {
    return `Encore ${plural(DECK_SIZE - draft.cards.length)}`;
  }
  if (status.gameRefusal !== null) {
    return curveLines(catalog, draft.cards).find((line) => !line.ok)?.text ?? 'Deck non jouable';
  }
  return draft.name.trim() === '' ? 'Donne un nom au deck' : 'Enregistrer le deck';
}
