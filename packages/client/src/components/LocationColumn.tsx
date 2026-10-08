import { useDroppable } from '@dnd-kit/core';
import type { CardView, LocationView, PlayerView } from '@ytcg-game/engine';
import { type Side, ghostsAt } from '../animation/placements.ts';
import { usePlacements, useScene } from '../animation/useReplay.ts';
import { type DropTarget, canDrop, dropId } from '../dnd.ts';
import { BoardCard, PendingCard } from './card/BoardCards.tsx';
import { useDragged } from './dnd/DragContext.ts';
import { LocationHeader } from './LocationHeader.tsx';

interface Props {
  location: LocationView;
  view: PlayerView;
  selected: string | null;
  onPlay: (index: number) => void;
  onCancel: (uid: string) => void;
}

interface SideProps {
  location: number;
  side: Side;
  cards: CardView[];
}

function SideCards({ location, side, cards }: SideProps): React.JSX.Element {
  const scene = useScene();
  const ghosts = ghostsAt(usePlacements(), scene.dying, { location, side, present: cards });
  return (
    <>
      {cards.map((card) => (
        <BoardCard key={card.uid} card={card} own={side === 'you'} />
      ))}
      {ghosts.map((card) => (
        <BoardCard key={card.uid} card={card} own={side === 'you'} ghost />
      ))}
    </>
  );
}

// Highlight while a card is dragged: valid, hovered or refused.
function dropClass(dragging: boolean, valid: boolean, isOver: boolean): string {
  if (!dragging) {
    return '';
  }
  if (!valid) {
    return ' drop-invalid';
  }
  return isOver ? ' drop-valid drop-over' : ' drop-valid';
}

export function LocationColumn({ location, view, selected, onPlay, onCancel }: Props): React.JSX.Element {
  const { power, index } = location;
  const target: DropTarget = { kind: 'location', index };
  const dragged = useDragged();
  const valid = dragged !== null && canDrop(view, dragged, target);
  const { setNodeRef, isOver } = useDroppable({ id: dropId(target), disabled: !valid });
  const canPlay = selected !== null && canDrop(view, { uid: selected, origin: 'hand' }, target);
  const lead = power.you === power.opponent ? 'tie' : power.you > power.opponent ? 'you' : 'opponent';
  const play = (event: React.MouseEvent): void => {
    event.stopPropagation();
    onPlay(index);
  };
  return (
    <section
      ref={setNodeRef}
      className={`location lead-${lead}${canPlay ? ' can-play' : ''}${dropClass(dragged !== null, valid, isOver)}`}
      aria-label={`Lieu ${index + 1}`}
      onClick={canPlay ? play : undefined}
    >
      {canPlay && (
        <button type="button" className="play-here btn-arcade" onClick={play}>
          Poser ici
        </button>
      )}
      <div className="location-side opponent">
        <SideCards location={index} side="opponent" cards={location.cards.opponent} />
      </div>
      <div className="location-power opponent">{power.opponent}</div>
      <LocationHeader location={location} />
      <div className="location-power you">{power.you}</div>
      <div className="location-side you">
        <SideCards location={index} side="you" cards={location.cards.you} />
        {location.yourPending.map((card) => (
          <PendingCard key={card.uid} card={card} locked={view.ready} onCancel={onCancel} />
        ))}
      </div>
    </section>
  );
}
