import type { CardDefinition } from '@ytcg-game/engine';
import { catalog } from '../../catalog.ts';
import type { PoolCard } from '../../decks/pool.ts';
import { useTooltipAnchor } from '../../lib/useTooltipAnchor.ts';
import type { CardSize } from '../card/CardBand.tsx';
import { CardPlate } from '../card/CardFace.tsx';
import { Tooltip } from '../Tooltip.tsx';
import { DefinitionTip } from './DefinitionTip.tsx';

interface Props {
  card: PoolCard;
  selected: boolean;
  disabled: boolean;
  errors: string[] | undefined;
  onToggle: () => void;
}

// The game card straight from its definition (compact in grids, full for hand-sized tiles).
export function DefinitionFace({
  definition,
  size = 'compact',
  dim = false,
}: {
  definition: CardDefinition;
  size?: CardSize;
  dim?: boolean;
}): React.JSX.Element {
  return <CardPlate definition={definition} cost={definition.cost} power={definition.power} size={size} dim={dim} />;
}

function TileTip({ card }: { card: PoolCard }): React.JSX.Element {
  const { definition } = card;
  return (
    <DefinitionTip definition={definition}>
      <p className="tip-text is-empty">
        {catalog.extensions.get(definition.extension) ?? definition.extension} · ×{card.quantity}
        {card.holo > 0 ? ` (dont ${card.holo} holo)` : ''}
      </p>
    </DefinitionTip>
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
      </button>
      <span className="pool-tile__own" aria-hidden="true">
        ×{card.quantity}
      </span>
      {selected && (
        <span className="pool-tile__deck" aria-hidden="true">
          Deck
        </span>
      )}
      {errors !== undefined && <p className="error is-small">{errors.join(' ')}</p>}
      {open && (
        <Tooltip anchor={anchor} id={id}>
          <TileTip card={card} />
        </Tooltip>
      )}
    </li>
  );
}
