import { useMemo, useState } from 'react';
import type { Deck } from '../../ytcg/schemas.ts';
import type { YtcgSession } from '../../ytcg/session.ts';
import type { YtcgSessionHandle } from '../../ytcg/useYtcgSession.ts';
import { catalog } from '../../catalog.ts';
import { playableDeckId } from '../../decks/deck-state.ts';
import { buildPool } from '../../decks/pool.ts';
import { pickFan } from '../../decks/showcase.ts';
import { Toast } from '../ui/Toast.tsx';
import { Hero } from '../home/Hero.tsx';
import { HomeShell } from '../home/HomeShell.tsx';
import { type PlayHandlers, PlayActions } from '../home/PlayActions.tsx';
import { DeckEditor } from './DeckEditor.tsx';
import { DeckList } from './DeckList.tsx';

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

const CATALOG_CARDS = [...catalog.cards.values()];

// Cards of the active deck, else of the collection, else of the catalog: the fan shows real cards.
function useFan(session: ReadySession, selected: Deck | undefined): ReturnType<typeof pickFan> {
  const owned = useMemo(() => buildPool(catalog, session.collection).cards.map((card) => card.definition), [session]);
  const deckCards = selected?.cards.flatMap((id) => catalog.cards.get(id) ?? []) ?? [];
  return pickFan(deckCards.length >= 3 ? deckCards : owned, CATALOG_CARDS);
}

function scrollToDecks(): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('decks')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

interface ListProps extends PlayHandlers {
  ytcg: YtcgSessionHandle;
  session: ReadySession;
  error: string | null;
  selected: string | null;
  onSelect: (id: string) => void;
  onEdit: (deck: Deck | null) => void;
}

function DeckLobby({
  ytcg,
  session,
  error,
  selected,
  onSelect,
  onEdit,
  onCreate,
  onJoin,
}: ListProps): React.JSX.Element {
  const fan = useFan(
    session,
    session.decks.find((deck) => deck.id === selected),
  );
  return (
    <HomeShell
      active="arena"
      onArena={() => {
        window.scrollTo({ top: 0 });
      }}
      onDecks={scrollToDecks}
    >
      <main className="home">
        <Hero fan={fan}>
          {selected === null && <p className="location-help">Choisis un deck jouable pour lancer une partie.</p>}
          <PlayActions
            options={selected === null ? null : () => ({ deckId: selected })}
            onCreate={onCreate}
            onJoin={onJoin}
          />
        </Hero>
        <DeckList
          decks={session.decks}
          maxDecks={session.maxDecks}
          selected={selected}
          onSelect={onSelect}
          onEdit={onEdit}
          onDeleted={(id) => {
            ytcg.updateDecks((decks) => decks.filter((deck) => deck.id !== id));
          }}
        />
        {error !== null && <Toast tone="danger">{error}</Toast>}
      </main>
    </HomeShell>
  );
}

export function DeckHome({ ytcg, session, ...rest }: Props): React.JSX.Element {
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
  return (
    <DeckLobby
      ytcg={ytcg}
      session={session}
      selected={playableDeckId(catalog, session.decks, chosen)}
      onSelect={setChosen}
      onEdit={(deck) => {
        setEditing({ deck });
      }}
      {...rest}
    />
  );
}
