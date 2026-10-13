import { changeText, noticeTitle } from '../../decks/notice.ts';
import type { Deck } from '../../ytcg/schemas.ts';

interface Props {
  deck: Deck;
  // Acknowledge button (home); the builder omits it, saving the deck clears the notice.
  onAcknowledge?: () => void;
}

// What ytcg changed in the deck since the player last looked: a card lost, or a card switching kind.
export function DeckChanges({ deck, onAcknowledge }: Props): React.JSX.Element | null {
  if (deck.changes.length === 0) {
    return null;
  }
  return (
    <section className="deck-changes" role="status">
      <h3>{noticeTitle(deck.name)}</h3>
      <ul>
        {deck.changes.map((change) => (
          <li key={`${change.card}-${change.at}`}>{changeText(change)}</li>
        ))}
      </ul>
      {onAcknowledge !== undefined && (
        <button type="button" onClick={onAcknowledge}>
          Compris
        </button>
      )}
    </section>
  );
}
