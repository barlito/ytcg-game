import { DECK_SIZE } from '@ytcg-game/engine';
import type { LocationDefinition } from '@ytcg-game/engine';
import type { DraftStatus } from '../../decks/draft.ts';
import { DECK_NAME_MAX } from '../../decks/draft.ts';
import type { DeckEditorState } from '../../decks/useDeckEditor.ts';
import { CurvePanel } from './CurvePanel.tsx';
import { SelectedCards } from './SelectedCards.tsx';
import { TerrainField } from './TerrainField.tsx';

interface Props {
  editor: DeckEditorState;
  status: DraftStatus;
  terrains: LocationDefinition[];
  owned: ReadonlySet<string>;
  onCancel: () => void;
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
    <label className="field">
      Nom du deck
      <input
        value={editor.draft.name}
        maxLength={DECK_NAME_MAX}
        placeholder="Mon deck"
        onChange={(event) => {
          editor.dispatch({ type: 'rename', name: event.target.value });
        }}
      />
      {editor.errors.name.length > 0 && <span className="error is-small">{editor.errors.name.join(' ')}</span>}
    </label>
  );
}

function Footer({ editor, status, onCancel }: Omit<Props, 'terrains' | 'owned'>): React.JSX.Element {
  return (
    <div className="home-actions">
      <button type="button" className="btn-arcade" disabled={!status.canSave || editor.saving} onClick={editor.save}>
        {editor.saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      <button type="button" className="btn-ghost" onClick={onCancel}>
        Annuler
      </button>
    </div>
  );
}

export function EditorSidebar({ editor, status, terrains, owned, onCancel }: Props): React.JSX.Element {
  const { draft, errors } = editor;
  return (
    <aside className="editor__side">
      <NameField editor={editor} />
      <SelectedCards
        cards={draft.cards}
        owned={owned}
        errors={errors.byCard}
        onRemove={(card) => {
          editor.dispatch({ type: 'toggle', card });
        }}
      />
      <Messages items={errors.cards} loginUrl={null} />
      <TerrainField
        terrain={draft.terrain}
        terrains={terrains}
        errors={errors.terrain}
        onChange={(terrain) => {
          editor.dispatch({ type: 'terrain', terrain });
        }}
      />
      <CurvePanel cards={draft.cards} />
      {status.gameRefusal !== null && <p className="warning">{status.gameRefusal}</p>}
      {!status.full && <p className="location-help">Choisis encore {DECK_SIZE - draft.cards.length} carte(s).</p>}
      <Messages items={errors.general} loginUrl={errors.loginUrl} />
      <Footer editor={editor} status={status} onCancel={onCancel} />
    </aside>
  );
}
