import { type CardView, STATUS_IDS, describeCard, statusRule } from '@ytcg-game/engine';
import { catalog } from '../../catalog.ts';
import { tiltOnLeave, tiltOnMove } from '../../lib/hoverTilt.ts';
import { powerTrend } from '../../power.ts';
import type { CardEffect } from '../../animation/scene.ts';
import { Artwork } from '../Artwork.tsx';

interface Props {
  card: CardView;
  // Hand cards are bigger and print their effect text.
  withText?: boolean;
  effect?: CardEffect | null;
}

const TREND_LABEL = { up: 'renforcée', down: 'affaiblie', even: '' } as const;

export function PowerBadge({ card }: { card: CardView }): React.JSX.Element {
  const trend = powerTrend(card);
  return (
    <span className={`tcard__power trend-${trend}`} aria-label={`Puissance ${card.power} ${TREND_LABEL[trend]}`}>
      {card.power}
    </span>
  );
}

function StatusPips({ card }: { card: CardView }): React.JSX.Element | null {
  const statuses = STATUS_IDS.filter((status) => (card.statuses[status] ?? 0) > 0);
  if (statuses.length === 0) {
    return null;
  }
  return (
    <span className="tcard__statuses">
      {statuses.map((status) => (
        <span key={status} className={`pip status-${status}`}>
          {statusRule(status).name}
          {(card.statuses[status] ?? 0) > 1 ? ` ×${String(card.statuses[status])}` : ''}
        </span>
      ))}
    </span>
  );
}

// Lightweight port of the ytcg card: artwork under a dark mat, neon line, name, badges, rarity glow, hover tilt.
export function CardFace({ card, withText = false, effect = null }: Props): React.JSX.Element {
  const definition = catalog.card(card.defId);
  const classes = ['tcard', withText ? 'has-text' : '', effect === null ? '' : `fx-${effect}`];
  return (
    <div
      className={classes.join(' ')}
      data-rarity={definition.rarity}
      onPointerMove={tiltOnMove}
      onPointerLeave={tiltOnLeave}
    >
      <div className="tcard__body">
        <Artwork key={definition.id} image={definition.image} className="tcard__art" />
        <span className="tcard__glare" />
        <span className="tcard__mat" />
        <span className="tcard__cost" aria-label={`Coût ${card.cost}`}>
          {card.cost}
        </span>
        <PowerBadge card={card} />
        <span className="tcard__name">{definition.name}</span>
        {withText && <span className="tcard__text">{describeCard(catalog, definition).join(' ')}</span>}
        <span className="tcard__rarity" />
        <StatusPips card={card} />
      </div>
    </div>
  );
}

export function CardBack({ effect = null }: { effect?: CardEffect | null }): React.JSX.Element {
  return (
    <div className={`tcard is-back${effect === null ? '' : ` fx-${effect}`}`} aria-label="Carte face cachée">
      <div className="tcard__body">
        <span className="tcard__logo">YOUL</span>
      </div>
    </div>
  );
}
