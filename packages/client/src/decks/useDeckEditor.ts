import { type Dispatch, useReducer, useState } from 'react';
import { saveDeck } from '../ytcg/api.ts';
import type { Deck } from '../ytcg/schemas.ts';
import { type DeckDraft, type DraftAction, draftFrom, draftPayload, draftReducer } from './draft.ts';
import { type DraftErrors, NO_ERRORS, errorsFromFailure } from './violations.ts';

export interface DeckEditorState {
  draft: DeckDraft;
  dispatch: Dispatch<DraftAction>;
  errors: DraftErrors;
  saving: boolean;
  save: () => void;
}

export function useDeckEditor(deck: Deck | null, onSaved: (deck: Deck) => void): DeckEditorState {
  const [draft, dispatch] = useReducer(draftReducer, deck, draftFrom);
  const [errors, setErrors] = useState<DraftErrors>(NO_ERRORS);
  const [saving, setSaving] = useState(false);
  const save = (): void => {
    const payload = draftPayload(draft);
    setSaving(true);
    void saveDeck(draft.id, payload).then((result) => {
      setSaving(false);
      if (result.ok) {
        onSaved(result.value);
        return;
      }
      setErrors(errorsFromFailure(result.failure, payload.cards));
    });
  };
  return { draft, dispatch, errors, saving, save };
}
