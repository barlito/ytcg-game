import { useState } from 'react';
import { catalog } from '../../catalog.ts';
import { deckBadge } from '../../decks/deck-state.ts';
import { deckCover } from '../../decks/showcase.ts';
import { deleteDeck } from '../../ytcg/api.ts';
import type { Deck } from '../../ytcg/schemas.ts';
import { Artwork } from '../Artwork.tsx';

export interface TileHandlers {
  onSelect: (id: string) => void;
  onEdit: (deck: Deck) => void;
  onDeleted: (id: string) => void;
}

interface Props extends TileHandlers {
  deck: Deck;
  selected: boolean;
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

function cardCount(deck: Deck): string {
  const owned = deck.cards.length - deck.missingCards.length;
  return owned === deck.cards.length
    ? `${String(owned)} cartes`
    : `${String(owned)} / ${String(deck.cards.length)} cartes`;
}

// A playable deck is picked; a deck to fix opens the editor instead.
export function DeckTile({ deck, selected, onSelect, onEdit, onDeleted }: Props): React.JSX.Element {
  const remove = useDelete(deck, onDeleted);
  const badge = deckBadge(catalog, deck);
  return (
    <li className={`deck-tile${selected ? ' is-selected' : ''}${badge.ok ? '' : ' is-broken'}`}>
      <button
        type="button"
        className="deck-tile__body"
        aria-pressed={badge.ok ? selected : undefined}
        title={badge.detail ?? undefined}
        onClick={() => {
          if (badge.ok) {
            onSelect(deck.id);
          } else {
            onEdit(deck);
          }
        }}
      >
        <Artwork image={deckCover(catalog, deck)} className="deck-tile__art" />
        <span className="deck-tile__shade" />
        <span className={`deck-tile__badge${badge.ok ? ' is-ok' : ''}`}>{badge.label}</span>
        <span className="deck-tile__info">
          <span className="deck-tile__name">{deck.name}</span>
          <span className="deck-tile__meta">
            {cardCount(deck)} · {terrainName(deck)}
          </span>
        </span>
      </button>
      <div className="deck-tile__actions">
        <button
          type="button"
          onClick={() => {
            onEdit(deck);
          }}
        >
          Modifier
        </button>
        <button type="button" onClick={remove.run}>
          {remove.confirm ? 'Confirmer la suppression' : 'Supprimer'}
        </button>
      </div>
      {remove.error !== null && <p className="error is-small">{remove.error}</p>}
    </li>
  );
}
