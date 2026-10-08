import { type CardDefinition, describeCard } from '@ytcg-game/engine';
import { catalog } from '../../catalog.ts';
import type { PoolCard } from '../../decks/pool.ts';
import { tiltOnLeave, tiltOnMove } from '../../lib/hoverTilt.ts';
import { useTooltipAnchor } from '../../lib/useTooltipAnchor.ts';
import { Artwork } from '../Artwork.tsx';
import { Tooltip } from '../Tooltip.tsx';

interface Props {
  card: PoolCard;
  selected: boolean;
  disabled: boolean;
  errors: string[] | undefined;
  onToggle: () => void;
}

// The game card as in hand (artwork, cost, power, effect text), straight from its definition.
export function DefinitionFace({ definition }: { definition: CardDefinition }): React.JSX.Element {
  return (
    <div
      className="tcard has-text"
      data-rarity={definition.rarity}
      onPointerMove={tiltOnMove}
      onPointerLeave={tiltOnLeave}
    >
      <div className="tcard__body">
        <Artwork image={definition.image} className="tcard__art" />
        <span className="tcard__glare" />
        <span className="tcard__mat" />
        <span className="tcard__cost">{definition.cost}</span>
        <span className="tcard__power">{definition.power}</span>
        <span className="tcard__name">{definition.name}</span>
        <span className="tcard__text">{describeCard(catalog, definition).join(' ')}</span>
        <span className="tcard__rarity" />
      </div>
    </div>
  );
}

function TileTip({ card }: { card: PoolCard }): React.JSX.Element {
  const { definition } = card;
  const text = describeCard(catalog, definition);
  return (
    <div className="tip-card" data-rarity={definition.rarity}>
      <p className="tip-title">
        {definition.name}
        <span>
          Coût {definition.cost} · Puissance {definition.power}
        </span>
      </p>
      <p className={`tip-text${text.length === 0 ? ' is-empty' : ''}`}>
        {text.length === 0 ? 'Aucun effet.' : text.join(' ')}
      </p>
      <p className="tip-text is-empty">
        {catalog.extensions.get(definition.extension) ?? definition.extension} · ×{card.quantity}
        {card.holo > 0 ? ` (dont ${card.holo} holo)` : ''}
      </p>
    </div>
  );
}

export function PoolTile({ card, selected, disabled, errors, onToggle }: Props): React.JSX.Element {
  const { anchor, setAnchor, id, open, handlers } = useTooltipAnchor(false);
  const action = selected ? 'Retirer du deck' : 'Ajouter au deck';
  return (
    <li className={`pool-tile${selected ? ' is-selected' : ''}`}>
      <button
        ref={setAnchor}
        type="button"
        className={`card-slot${disabled ? ' is-disabled' : ''}`}
        aria-pressed={selected}
        aria-label={`${action} : ${card.definition.name}`}
        aria-describedby={open ? id : undefined}
        aria-disabled={disabled}
        onClick={() => {
          // Still focusable and hoverable when the deck is full, for the tooltip.
          if (!disabled) {
            onToggle();
          }
        }}
        {...handlers}
      >
        <DefinitionFace definition={card.definition} />
        {selected && <span className="pool-tile__check">Dans le deck</span>}
      </button>
      {errors !== undefined && <p className="error is-small">{errors.join(' ')}</p>}
      {open && (
        <Tooltip anchor={anchor} id={id}>
          <TileTip card={card} />
        </Tooltip>
      )}
    </li>
  );
}
