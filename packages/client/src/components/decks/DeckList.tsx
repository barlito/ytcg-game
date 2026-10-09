import type { Deck } from '../../ytcg/schemas.ts';
import { DeckTile, type TileHandlers } from './DeckTile.tsx';

interface Props extends TileHandlers {
  decks: Deck[];
  maxDecks: number;
  selected: string | null;
  // null = a new deck.
  onEdit: (deck: Deck | null) => void;
}

// « Tes decks n / max »: notched tiles, a carousel on mobile.
export function DeckList({ decks, maxDecks, selected, onEdit, ...handlers }: Props): React.JSX.Element {
  return (
    <section className="deck-list" id="decks" aria-labelledby="decks-title">
      <header className="deck-list__head">
        <h2 id="decks-title">
          Tes decks{' '}
          <span>
            {decks.length} / {maxDecks}
          </span>
        </h2>
        <button
          type="button"
          className="deck-list__new"
          disabled={decks.length >= maxDecks}
          onClick={() => {
            onEdit(null);
          }}
        >
          + Nouveau deck
        </button>
      </header>
      {decks.length === 0 ? (
        <p className="location-help">
          Aucun deck pour l’instant : compose ton premier deck de 12 cartes avec ta collection.
        </p>
      ) : (
        <ul className="deck-tiles">
          {decks.map((deck) => (
            <DeckTile key={deck.id} deck={deck} selected={deck.id === selected} onEdit={onEdit} {...handlers} />
          ))}
        </ul>
      )}
    </section>
  );
}
