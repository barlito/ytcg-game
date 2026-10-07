import { type CardView, STATUS_IDS, describeCard, statusRule } from '@ytcg-game/engine';
import { catalog } from '../catalog.ts';
import { Artwork } from './Artwork.tsx';

interface Props {
  card: CardView;
  selected?: boolean;
  pending?: boolean;
  disabled?: boolean;
  onClick?: (() => void) | undefined;
}

export function CardTile({
  card,
  selected = false,
  pending = false,
  disabled = false,
  onClick,
}: Props): React.JSX.Element {
  const definition = catalog.card(card.defId);
  const statuses = STATUS_IDS.filter((status) => (card.statuses[status] ?? 0) > 0);
  const classes = ['card', selected ? 'is-selected' : '', pending ? 'is-pending' : '', disabled ? 'is-disabled' : ''];
  return (
    <button
      type="button"
      className={classes.join(' ')}
      data-rarity={definition.rarity}
      onClick={onClick}
      disabled={onClick === undefined}
    >
      <Artwork key={definition.id} image={definition.image} className="card-art" />
      <span className="card-cost">{card.cost}</span>
      <span className="card-power">{card.power}</span>
      <span className="card-name">{definition.name}</span>
      <span className="card-text">{describeCard(catalog, definition).join(' ')}</span>
      {statuses.length > 0 && (
        <span className="card-statuses">
          {statuses.map((status) => (
            <span key={status} className={`status status-${status}`}>
              {statusRule(status).name}
              {(card.statuses[status] ?? 0) > 1 ? ` ×${String(card.statuses[status])}` : ''}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
