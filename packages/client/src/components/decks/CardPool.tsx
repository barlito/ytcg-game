import { useMemo, useState } from 'react';
import { catalog } from '../../catalog.ts';
import { NO_FILTER, type PoolCard, type PoolFilter, filterOptions, filterPool } from '../../decks/pool.ts';
import { PoolFilters } from './PoolFilters.tsx';
import { PoolTile } from './PoolTile.tsx';

interface Props {
  cards: PoolCard[];
  selected: string[];
  full: boolean;
  errors: Record<string, string[]>;
  onToggle: (card: string) => void;
}

export function CardPool({ cards, selected, full, errors, onToggle }: Props): React.JSX.Element {
  const [filter, setFilter] = useState<PoolFilter>(NO_FILTER);
  const options = useMemo(() => filterOptions(catalog, cards), [cards]);
  const shown = filterPool(cards, filter);
  return (
    <section className="pool" aria-label="Ta collection">
      <h2 className="eyebrow">Ta collection jouable ({cards.length} cartes)</h2>
      <PoolFilters options={options} filter={filter} onChange={setFilter} />
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
