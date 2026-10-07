import type { CardView } from '@ytcg-game/engine';
import { cardFx } from '../../animation/scene.ts';
import { useScene } from '../../animation/useReplay.ts';
import { catalog } from '../../catalog.ts';
import { DraggableCard } from '../dnd/DraggableCard.tsx';
import { CardButton } from './CardButton.tsx';
import { CardBack, CardFace } from './CardFace.tsx';

function labelOf(card: CardView): string {
  return `${catalog.card(card.defId).name}, coût ${card.cost}, puissance ${card.power}`;
}

interface BoardProps {
  card: CardView;
  own: boolean;
  ghost?: boolean;
}

// A revealed card, or one the replay has not revealed yet: still face down for the opponent, dimmed for its owner.
export function BoardCard({ card, own, ghost = false }: BoardProps): React.JSX.Element {
  const fx = cardFx(useScene(), card.uid);
  const hidden = fx.faceDown && !own;
  const classes = ['on-board', ghost ? 'is-ghost' : '', fx.faceDown && own ? 'is-pending' : ''];
  return (
    <CardButton
      card={card}
      fx={{ ...fx, faceDown: hidden }}
      className={classes.join(' ')}
      label={hidden ? 'Carte face cachée' : labelOf(card)}
    >
      {hidden ? <CardBack /> : <CardFace card={card} effect={fx.effect} />}
    </CardButton>
  );
}

interface PendingProps {
  card: CardView;
  locked: boolean;
  onCancel: (uid: string) => void;
}

// An own face-down card of this turn: click or drag it back to the hand to take it back.
export function PendingCard({ card, locked, onCancel }: PendingProps): React.JSX.Element {
  const fx = cardFx(useScene(), card.uid);
  return (
    <DraggableCard
      card={card}
      fx={fx}
      dragged={{ uid: card.uid, origin: 'pending' }}
      draggable={!locked}
      className="on-board is-pending"
      label={`${labelOf(card)}, posée face cachée${locked ? '' : ' : reprendre'}`}
      disabled={locked}
      onClick={
        locked
          ? undefined
          : () => {
              onCancel(card.uid);
            }
      }
    >
      <CardFace card={card} effect={fx.effect} />
    </DraggableCard>
  );
}

interface HandProps {
  card: CardView;
  playable: boolean;
  selected: boolean;
  onSelect: (uid: string | null) => void;
}

export function HandCard({ card, playable, selected, onSelect }: HandProps): React.JSX.Element {
  const fx = cardFx(useScene(), card.uid);
  const classes = ['in-hand', selected ? 'is-selected' : '', playable ? '' : 'is-disabled'];
  return (
    <DraggableCard
      card={card}
      fx={fx}
      dragged={{ uid: card.uid, origin: 'hand' }}
      draggable={playable}
      className={classes.join(' ')}
      label={`${labelOf(card)}${playable ? '' : ', pas jouable maintenant'}`}
      pinned={selected}
      disabled={!playable}
      onClick={
        playable
          ? () => {
              onSelect(selected ? null : card.uid);
            }
          : undefined
      }
    >
      <CardFace card={card} withText effect={fx.effect} />
    </DraggableCard>
  );
}
