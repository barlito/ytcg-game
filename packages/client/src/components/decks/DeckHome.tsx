import { useState } from 'react';
import type { Deck } from '../../ytcg/schemas.ts';
import type { YtcgSession } from '../../ytcg/session.ts';
import type { YtcgSessionHandle } from '../../ytcg/useYtcgSession.ts';
import { catalog } from '../../catalog.ts';
import { playableDeckId } from '../../decks/deck-state.ts';
import { type PlayHandlers, PlayActions } from '../home/PlayActions.tsx';
import { Title } from '../home/Title.tsx';
import { DeckEditor } from './DeckEditor.tsx';
import { DeckList } from './DeckList.tsx';
import '../../styles/decks.css';

type ReadySession = Extract<YtcgSession, { status: 'ready' }>;

interface Props extends PlayHandlers {
  ytcg: YtcgSessionHandle;
  session: ReadySession;
  error: string | null;
}

// Editing: null = the list, { deck: null } = a new deck.
type Editing = { deck: Deck | null } | null;

function replaceDeck(saved: Deck): (decks: Deck[]) => Deck[] {
  return (decks) =>
    decks.some((deck) => deck.id === saved.id)
      ? decks.map((deck) => (deck.id === saved.id ? saved : deck))
      : [...decks, saved];
}

export function DeckHome({ ytcg, session, error, onCreate, onJoin }: Props): React.JSX.Element {
  const [editing, setEditing] = useState<Editing>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  if (editing !== null) {
    return (
      <DeckEditor
        deck={editing.deck}
        collection={session.collection}
        onCancel={() => {
          setEditing(null);
        }}
        onSaved={(saved) => {
          ytcg.updateDecks(replaceDeck(saved));
          setChosen(saved.id);
          setEditing(null);
        }}
      />
    );
  }
  const selected = playableDeckId(catalog, session.decks, chosen);
  return (
    <main className="home">
      <Title />
      <DeckList
        decks={session.decks}
        maxDecks={session.maxDecks}
        selected={selected}
        onSelect={setChosen}
        onEdit={(deck) => {
          setEditing({ deck });
        }}
        onDeleted={(id) => {
          ytcg.updateDecks((decks) => decks.filter((deck) => deck.id !== id));
        }}
      />
      {selected === null && <p className="location-help">Choisis un deck jouable pour lancer une partie.</p>}
      <PlayActions
        options={selected === null ? null : () => ({ deckId: selected })}
        onCreate={onCreate}
        onJoin={onJoin}
      />
      {error !== null && <p className="error">{error}</p>}
    </main>
  );
}
