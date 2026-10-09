import { useMemo, useState } from 'react';
import { catalog } from '../../catalog.ts';
import { draftStatus } from '../../decks/draft.ts';
import { NO_FILTER, type PoolFilter, buildPool, filterOptions } from '../../decks/pool.ts';
import { useDeckEditor } from '../../decks/useDeckEditor.ts';
import type { Deck, OwnedCard } from '../../ytcg/schemas.ts';
import { HomeShell } from '../home/HomeShell.tsx';
import { CardPool } from './CardPool.tsx';
import { DeckPanel } from './DeckPanel.tsx';
import { PoolFilters } from './PoolFilters.tsx';
import '../../styles/cards.css';
import '../../styles/fx.css';
import '../../styles/decks.css';
import '../../styles/editor.css';

interface Props {
  // null = a new deck.
  deck: Deck | null;
  collection: OwnedCard[];
  onCancel: () => void;
  onSaved: (deck: Deck) => void;
}

export function DeckEditor({ deck, collection, onCancel, onSaved }: Props): React.JSX.Element {
  const editor = useDeckEditor(deck, onSaved);
  const [filter, setFilter] = useState<PoolFilter>(NO_FILTER);
  const pool = useMemo(() => buildPool(catalog, collection), [collection]);
  const options = useMemo(() => filterOptions(catalog, pool.cards), [pool]);
  const owned = useMemo(() => new Set(collection.map((card) => card.id)), [collection]);
  const status = draftStatus(catalog, editor.draft);
  return (
    <HomeShell active="decks" onArena={onCancel} tabs={false}>
      <main className="editor">
        <aside className="editor__filters" aria-label="Filtres">
          <button type="button" className="editor__back" onClick={onCancel}>
            ← Mes decks
          </button>
          <h1 className="editor__title">{deck === null ? 'Nouveau deck' : 'Modifier le deck'}</h1>
          <PoolFilters options={options} filter={filter} onChange={setFilter} />
        </aside>
        <CardPool
          cards={pool.cards}
          filter={filter}
          selected={editor.draft.cards}
          full={status.full}
          errors={editor.errors.byCard}
          onToggle={(card) => {
            editor.dispatch({ type: 'toggle', card });
          }}
        />
        <DeckPanel editor={editor} status={status} terrains={pool.terrains} owned={owned} />
      </main>
    </HomeShell>
  );
}
