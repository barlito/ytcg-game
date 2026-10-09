import { useState } from 'react';
import { DECK_SIZE } from '@ytcg-game/engine';
import type { LocationDefinition } from '@ytcg-game/engine';
import { catalog } from '../../catalog.ts';
import type { DraftStatus } from '../../decks/draft.ts';
import { DECK_NAME_MAX } from '../../decks/draft.ts';
import { saveLabel } from '../../decks/save-label.ts';
import type { DeckEditorState } from '../../decks/useDeckEditor.ts';
import { Progress } from '../ui/Progress.tsx';
import { CurvePanel } from './CurvePanel.tsx';
import { SelectedCards } from './SelectedCards.tsx';
import { TerrainField } from './TerrainField.tsx';

interface Props {
  editor: DeckEditorState;
  status: DraftStatus;
  terrains: LocationDefinition[];
  owned: ReadonlySet<string>;
}

function Messages({ items, loginUrl }: { items: string[]; loginUrl: string | null }): React.JSX.Element | null {
  if (items.length === 0 && loginUrl === null) {
    return null;
  }
  return (
    <div className="error" role="alert">
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
      {loginUrl !== null && <a href={loginUrl}>Se connecter sur Youl TCG</a>}
    </div>
  );
}

function NameField({ editor }: { editor: DeckEditorState }): React.JSX.Element {
  return (
    <label className="deck-name">
      <span className="panel-label is-accent">Deck</span>
      <input
        value={editor.draft.name}
        maxLength={DECK_NAME_MAX}
        placeholder="Nom du deck"
        aria-label="Nom du deck"
        onChange={(event) => {
          editor.dispatch({ type: 'rename', name: event.target.value });
        }}
      />
      {editor.errors.name.length > 0 && <span className="error is-small">{editor.errors.name.join(' ')}</span>}
    </label>
  );
}

function Count({ total }: { total: number }): React.JSX.Element {
  return (
    <div className="deck-count">
      <div className="deck-count__row">
        <span className="panel-label">Cartes</span>
        <span className={`deck-count__n${total === DECK_SIZE ? ' is-full' : ''}`}>
          <b>{total}</b> / {DECK_SIZE}
        </span>
      </div>
      <Progress value={total / DECK_SIZE} tone={total === DECK_SIZE ? 'live' : 'default'} label="Cartes du deck" />
    </div>
  );
}

function SaveButton({ editor, status }: Pick<Props, 'editor' | 'status'>): React.JSX.Element {
  const enabled = status.canSave && status.gameRefusal === null && !editor.saving;
  return (
    <span className="btn-glow deck-save">
      <button type="button" className="btn-arcade btn-lg" disabled={!enabled} onClick={editor.save}>
        {saveLabel(catalog, editor.draft, status, editor.saving)}
      </button>
    </span>
  );
}

export function DeckPanel({ editor, status, terrains, owned }: Props): React.JSX.Element {
  const { draft, errors } = editor;
  // Mobile only: the drawer shows the summary, the handle opens the list and the terrain.
  const [open, setOpen] = useState(false);
  return (
    <aside className={`deck-panel${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="deck-panel__handle"
        aria-expanded={open}
        aria-label={open ? 'Replier le deck' : 'Afficher le deck'}
        onClick={() => {
          setOpen(!open);
        }}
      />
      <NameField editor={editor} />
      <Count total={draft.cards.length} />
      <div className="panel-details">
        <SelectedCards
          cards={draft.cards}
          owned={owned}
          errors={errors.byCard}
          onRemove={(card) => {
            editor.dispatch({ type: 'toggle', card });
          }}
        />
        <Messages items={errors.cards} loginUrl={null} />
      </div>
      <CurvePanel cards={draft.cards} refusal={status.gameRefusal} />
      <TerrainField
        terrain={draft.terrain}
        terrains={terrains}
        errors={errors.terrain}
        onChange={(terrain) => {
          editor.dispatch({ type: 'terrain', terrain });
        }}
      />
      <Messages items={errors.general} loginUrl={errors.loginUrl} />
      <SaveButton editor={editor} status={status} />
    </aside>
  );
}
