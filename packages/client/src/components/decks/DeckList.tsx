import { useState } from 'react';
import { catalog } from '../../catalog.ts';
import { deckState } from '../../decks/deck-state.ts';
import { deleteDeck } from '../../ytcg/api.ts';
import type { Deck } from '../../ytcg/schemas.ts';

interface Props {
  decks: Deck[];
  maxDecks: number;
  selected: string | null;
  onSelect: (id: string) => void;
  // null = a new deck.
  onEdit: (deck: Deck | null) => void;
  onDeleted: (id: string) => void;
}

function StateBadge({ deck }: { deck: Deck }): React.JSX.Element {
  const state = deckState(catalog, deck);
  if (state.kind === 'ready') {
    return <span className="badge is-ok">Jouable</span>;
  }
  return (
    <span className="badge is-ko" title={state.text}>
      {state.kind === 'incomplete' ? state.text : 'Règles du duel'}
    </span>
  );
}

function terrainName(deck: Deck): string {
  if (deck.terrain === null) {
    return 'terrain aléatoire';
  }
  return catalog.locations.get(deck.terrain)?.name ?? 'terrain inconnu du jeu';
}

function useDelete(
  deck: Deck,
  onDeleted: (id: string) => void,
): { confirm: boolean; error: string | null; run: () => void } {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = (): void => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    void deleteDeck(deck.id).then((result) => {
      if (result.ok || result.failure.kind === 'refused') {
        onDeleted(deck.id);
        return;
      }
      setError(result.failure.message);
      setConfirm(false);
    });
  };
  return { confirm, error, run };
}

function DeckRow({
  deck,
  selected,
  onSelect,
  onEdit,
  onDeleted,
}: Omit<Props, 'decks' | 'maxDecks' | 'selected'> & { deck: Deck; selected: boolean }): React.JSX.Element {
  const remove = useDelete(deck, onDeleted);
  const playable = deckState(catalog, deck).kind === 'ready';
  return (
    <li className={`deck-row${selected ? ' is-selected' : ''}`}>
      <label className="deck-row__pick">
        <input
          type="radio"
          name="deck"
          checked={selected}
          disabled={!playable}
          onChange={() => {
            onSelect(deck.id);
          }}
        />
        <span className="deck-row__name">{deck.name}</span>
        <span className="deck-row__meta">{terrainName(deck)}</span>
      </label>
      <StateBadge deck={deck} />
      <button
        type="button"
        className="btn-ghost btn-small"
        onClick={() => {
          onEdit(deck);
        }}
      >
        Modifier
      </button>
      <button type="button" className="btn-ghost btn-small" onClick={remove.run}>
        {remove.confirm ? 'Confirmer la suppression' : 'Supprimer'}
      </button>
      {remove.error !== null && <p className="error">{remove.error}</p>}
    </li>
  );
}

export function DeckList({ decks, maxDecks, selected, onEdit, ...handlers }: Props): React.JSX.Element {
  return (
    <section className="deck-list">
      <header className="deck-list__head">
        <h2 className="eyebrow">
          Tes decks ({decks.length}/{maxDecks})
        </h2>
        <button
          type="button"
          className="btn-arcade btn-small"
          disabled={decks.length >= maxDecks}
          onClick={() => {
            onEdit(null);
          }}
        >
          Nouveau deck
        </button>
      </header>
      {decks.length === 0 ? (
        <p className="location-help">
          Aucun deck pour l’instant : compose ton premier deck de 12 cartes avec ta collection.
        </p>
      ) : (
        <ul>
          {decks.map((deck) => (
            <DeckRow key={deck.id} deck={deck} selected={deck.id === selected} onEdit={onEdit} {...handlers} />
          ))}
        </ul>
      )}
    </section>
  );
}
