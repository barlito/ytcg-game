import { useMemo } from 'react';
import { catalog } from '../../catalog.ts';
import { draftStatus } from '../../decks/draft.ts';
import { buildPool } from '../../decks/pool.ts';
import { useDeckEditor } from '../../decks/useDeckEditor.ts';
import type { Deck, OwnedCard } from '../../ytcg/schemas.ts';
import { CardPool } from './CardPool.tsx';
import { EditorSidebar } from './EditorSidebar.tsx';
import '../../styles/cards.css';
import '../../styles/fx.css';
import '../../styles/decks.css';

interface Props {
  // null = a new deck.
  deck: Deck | null;
  collection: OwnedCard[];
  onCancel: () => void;
  onSaved: (deck: Deck) => void;
}

export function DeckEditor({ deck, collection, onCancel, onSaved }: Props): React.JSX.Element {
  const editor = useDeckEditor(deck, onSaved);
  const pool = useMemo(() => buildPool(catalog, collection), [collection]);
  const owned = useMemo(() => new Set(collection.map((card) => card.id)), [collection]);
  const status = draftStatus(catalog, editor.draft);
  return (
    <main className="editor">
      <header className="editor__head">
        <h1 className="title is-small">{deck === null ? 'Nouveau deck' : 'Modifier le deck'}</h1>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Retour aux decks
        </button>
      </header>
      <div className="editor__layout">
        <CardPool
          cards={pool.cards}
          selected={editor.draft.cards}
          full={status.full}
          errors={editor.errors.byCard}
          onToggle={(card) => {
            editor.dispatch({ type: 'toggle', card });
          }}
        />
        <EditorSidebar editor={editor} status={status} terrains={pool.terrains} owned={owned} onCancel={onCancel} />
      </div>
    </main>
  );
}
