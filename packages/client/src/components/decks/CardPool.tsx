import { type PoolCard, type PoolFilter, filterPool } from '../../decks/pool.ts';
import { PoolTile } from './PoolTile.tsx';

interface Props {
  cards: PoolCard[];
  filter: PoolFilter;
  selected: string[];
  full: boolean;
  errors: Record<string, string[]>;
  onToggle: (card: string) => void;
}

export function CardPool({ cards, filter, selected, full, errors, onToggle }: Props): React.JSX.Element {
  const shown = filterPool(cards, filter);
  return (
    <section className="pool" aria-label="Ta collection">
      <header className="pool__head">
        <h2>Ta collection</h2>
        <span>
          {shown.length === cards.length
            ? `${String(cards.length)} cartes jouables en duel`
            : `${String(shown.length)} / ${String(cards.length)} cartes`}
        </span>
        <span className="pool__sort">Tri · coût ↑</span>
      </header>
      {shown.length === 0 ? (
        <p className="location-help">
          {cards.length === 0
            ? 'Aucune carte de ta collection n’est encore jouable dans le duel.'
            : 'Aucune carte pour ces filtres.'}
        </p>
      ) : (
        <ul className="pool-grid">
          {shown.map((card) => {
            const isSelected = selected.includes(card.definition.id);
            return (
              <PoolTile
                key={card.definition.id}
                card={card}
                selected={isSelected}
                disabled={full && !isSelected}
                errors={errors[card.definition.id]}
                onToggle={() => {
                  onToggle(card.definition.id);
                }}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
