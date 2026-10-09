import type { CardDefinition, CardView } from '@ytcg-game/engine';
import cardBack from '../../assets/card-back.svg';
import { catalog } from '../../catalog.ts';
import { tiltOnLeave, tiltOnMove } from '../../lib/hoverTilt.ts';
import { type PowerTrend, powerTrend, statusLines } from '../../power.ts';
import type { CardEffect, CostFlow } from '../../animation/fx.ts';
import '../../styles/card-band.css';
import '../../styles/cards.css';
import '../../styles/holo.css';
import '../../styles/holo-cosmos.css';
import '../../styles/holo-shine-basic.css';
import '../../styles/holo-trainer.css';
import { Artwork } from '../Artwork.tsx';
import { CardBand, type CardSize } from './CardBand.tsx';
import { heatOf, stacksOf, stateClasses } from './cardStates.ts';
import { StatusPills } from './StatusPills.tsx';
import { HoloLayers, useHolo } from './Holo.tsx';
import { type RarityKey, rarityKey } from './rarity.ts';

export interface PlateProps {
  definition: CardDefinition;
  cost: number;
  power: number;
  trend?: PowerTrend;
  // Status pills glued to the left edge (« Folie », « Défonce ×2 »).
  statuses?: readonly string[];
  size?: CardSize;
  effect?: CardEffect | null;
  // Status stacks (drunk sway, shield, heat) and the cost change playing in the replay.
  states?: CardView['statuses'];
  costFlow?: CostFlow | null;
  // Just played this turn: cyan outline.
  fresh?: boolean;
  // A card the player no longer owns: faded and grey.
  dim?: boolean;
}

function plateClasses({ effect = null, fresh = false, dim = false, states }: PlateProps, holo: string): string {
  const flags = [effect === null ? '' : `fx-${effect}`, fresh ? 'is-fresh' : '', dim ? 'is-dim' : ''];
  return ['tcard', ...flags, ...stateClasses(states), holo].filter(Boolean).join(' ');
}

// The printed card from plain values: ytcg frame (artwork, mat, name) under the « biseau verre » band.
export function CardPlate(props: PlateProps): React.JSX.Element {
  const { definition, cost, power, trend = 'even', statuses = [], size = 'full', costFlow = null } = props;
  const rarity = rarityKey(definition);
  const holo = useHolo(definition, size);
  return (
    <div
      className={plateClasses(props, holo.className)}
      style={holo.style}
      data-rarity={rarity}
      data-size={size}
      data-heat={heatOf(props.states)}
      onPointerEnter={holo.arm}
      onPointerMove={tiltOnMove}
      onPointerLeave={tiltOnLeave}
    >
      <div className="tcard__body">
        <Artwork key={definition.id} image={definition.image} className="tcard__art" />
        {holo.lit ? <HoloLayers /> : <span className="tcard__glare" />}
        <span className="tcard__mat" />
        <span className="tcard__name">{definition.name}</span>
        <span className="tcard__ext">{catalog.extensions.get(definition.extension) ?? ''}</span>
        <CardBand
          definition={definition}
          rarity={rarity}
          size={size}
          cost={cost}
          power={power}
          trend={trend}
          costFlow={costFlow}
        />
        <StatusPills labels={statuses} states={props.states} />
        {stacksOf(props.states, 'protected') > 0 && <span className="tcard__shield" />}
      </div>
    </div>
  );
}

interface FaceProps {
  card: CardView;
  size?: CardSize;
  effect?: CardEffect | null;
  costFlow?: CostFlow | null;
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
      states={card.statuses}
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
