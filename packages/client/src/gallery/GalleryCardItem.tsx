import { statusRule } from '@ytcg-game/engine';
import { CardPlate } from '../components/card/CardFace.tsx';
import { RARITY_LABEL, rarityGlyph, rarityKey } from '../components/card/rarity.ts';
import { StatusIcon } from '../components/card/StatusIcon.tsx';
import { TagList } from '../components/card/TagList.tsx';
import type { GalleryCard } from './gallery.ts';

function Meta({ card }: { card: GalleryCard }): React.JSX.Element {
  const { definition } = card;
  const rarity = rarityKey(definition);
  return (
    <p className="gallery-card__meta">
      <span className="chip">Coût {definition.cost}</span>
      <span className="chip">Puissance {definition.power}</span>
      <span className="chip gallery-rarity" data-rarity={rarity}>
        {rarityGlyph(rarity)} {RARITY_LABEL[rarity]}
      </span>
      {!definition.deckable && <span className="chip tone-warn">Forme évoluée</span>}
      {definition.holo !== null && <span className="chip tone-cyan">Holo · {definition.holo}</span>}
    </p>
  );
}

function InnateStatuses({ card }: { card: GalleryCard }): React.JSX.Element | null {
  const { statuses } = card.definition;
  if (statuses.length === 0) {
    return null;
  }
  return (
    <ul className="gallery-card__statuses" aria-label="États de départ">
      {statuses.map((id) => (
        <li key={id}>
          <StatusIcon id={id} stacks={1} crisis={null} showStacks={false} className="gallery-status-icon" />
          {statusRule(id).name}
        </li>
      ))}
    </ul>
  );
}

function EffectText({ text }: { text: readonly string[] }): React.JSX.Element {
  if (text.length === 0) {
    return <p className="gallery-card__text is-empty">Aucun effet.</p>;
  }
  return (
    <>
      {text.map((line) => (
        <p key={line} className="gallery-card__text">
          {line}
        </p>
      ))}
    </>
  );
}

// The card as printed in the hand, then everything the review needs, readable without hovering.
export function GalleryCardItem({ card }: { card: GalleryCard }): React.JSX.Element {
  const { definition } = card;
  return (
    <li className="gallery-card" data-rarity={rarityKey(definition)}>
      <div className="gallery-card__face">
        <CardPlate
          definition={definition}
          cost={definition.cost}
          power={definition.power}
          size="full"
          holo={definition.holo !== null}
        />
      </div>
      <div className="gallery-card__info">
        <h3>{definition.name}</h3>
        <Meta card={card} />
        <InnateStatuses card={card} />
        <EffectText text={card.text} />
        <TagList definition={definition} />
      </div>
    </li>
  );
}
