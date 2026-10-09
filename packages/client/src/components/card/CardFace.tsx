import type { CardDefinition, CardView } from '@ytcg-game/engine';
import cardBack from '../../assets/card-back.svg';
import { catalog } from '../../catalog.ts';
import { tiltOnLeave, tiltOnMove } from '../../lib/hoverTilt.ts';
import { type PowerTrend, powerTrend, statusLines } from '../../power.ts';
import type { CardEffect } from '../../animation/scene.ts';
import '../../styles/card-band.css';
import '../../styles/cards.css';
import { Artwork } from '../Artwork.tsx';
import { CardBand, type CardSize } from './CardBand.tsx';
import { type RarityKey, hasSheen, rarityKey } from './rarity.ts';

export interface PlateProps {
  definition: CardDefinition;
  cost: number;
  power: number;
  trend?: PowerTrend;
  // Status pills glued to the left edge (« Folie », « Défonce ×2 »).
  statuses?: readonly string[];
  size?: CardSize;
  effect?: CardEffect | null;
  // Just played this turn: cyan outline.
  fresh?: boolean;
  // A card the player no longer owns: faded and grey.
  dim?: boolean;
}

function StatusPills({ labels }: { labels: readonly string[] }): React.JSX.Element | null {
  if (labels.length === 0) {
    return null;
  }
  return (
    <span className="tcard__statuses">
      {labels.map((label) => (
        <span key={label} className="pip">
          {label}
        </span>
      ))}
    </span>
  );
}

function plateClasses({ effect = null, fresh = false, dim = false }: PlateProps): string {
  return ['tcard', effect === null ? '' : `fx-${effect}`, fresh ? 'is-fresh' : '', dim ? 'is-dim' : '']
    .filter(Boolean)
    .join(' ');
}

// The printed card from plain values: ytcg frame (artwork, mat, name) under the « biseau verre » band.
export function CardPlate(props: PlateProps): React.JSX.Element {
  const { definition, cost, power, trend = 'even', statuses = [], size = 'full' } = props;
  const rarity = rarityKey(definition);
  return (
    <div
      className={plateClasses(props)}
      data-rarity={rarity}
      data-size={size}
      onPointerMove={tiltOnMove}
      onPointerLeave={tiltOnLeave}
    >
      <div className="tcard__body">
        <Artwork key={definition.id} image={definition.image} className="tcard__art" />
        <span className="tcard__glare" />
        <span className="tcard__mat" />
        {hasSheen(rarity) && <span className="tcard__sheen" />}
        <span className="tcard__name">{definition.name}</span>
        <CardBand definition={definition} rarity={rarity} size={size} cost={cost} power={power} trend={trend} />
        <StatusPills labels={statuses} />
      </div>
    </div>
  );
}

interface FaceProps {
  card: CardView;
  size?: CardSize;
  effect?: CardEffect | null;
  fresh?: boolean;
  dim?: boolean;
}

// A card of the game: live cost, power (renforcée / affaiblie) and statuses.
export function CardFace({ card, ...rest }: FaceProps): React.JSX.Element {
  const statuses = statusLines(card).map(({ name, stacks }) => (stacks > 1 ? `${name} ×${String(stacks)}` : name));
  return (
    <CardPlate
      definition={catalog.card(card.defId)}
      cost={card.cost}
      power={card.power}
      trend={powerTrend(card)}
      statuses={statuses}
      {...rest}
    />
  );
}

interface BackProps {
  effect?: CardEffect | null;
  // Known to the viewer only (own cards): the rarity glow stays, an unknown card glows common.
  rarity?: RarityKey;
}

export function CardBack({ effect = null, rarity = 'common' }: BackProps): React.JSX.Element {
  return (
    <div
      className={`tcard is-back${effect === null ? '' : ` fx-${effect}`}`}
      data-rarity={rarity}
      aria-label="Carte face cachée"
    >
      <div className="tcard__body">
        <img className="tcard__art" src={cardBack} alt="" draggable={false} />
      </div>
    </div>
  );
}
