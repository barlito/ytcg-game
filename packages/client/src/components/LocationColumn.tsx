import { useDroppable } from '@dnd-kit/core';
import { type CardView, LOCATION_CAPACITY, type LocationView, type PlayerView } from '@ytcg-game/engine';
import { type RowCard, type Side, departingAt, ghostsAt, rowWithGhosts } from '../animation/placements.ts';
import { usePlacements, useScene } from '../animation/useReplay.ts';
import { type DropTarget, canDrop, dropId } from '../dnd.ts';
import { catalog } from '../catalog.ts';
import { leadOf } from '../lib/lead.ts';
import { type SlotKind, type TerrainState, emptySlotKinds, terrainState } from '../lib/terrainRules.ts';
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
  terrain: TerrainState;
  // Face-down cards of this turn (your side only) and whether a card can land here now.
  pending?: React.ReactNode;
  pendingCount?: number;
  accepting?: boolean;
}

// Empty slots complete the row to the location capacity; the first one is the drop zone while a card can land.
// Slots the terrain takes away are barred, the others grey out while the location is closed.
function EmptySlots({ kinds, accepting }: { kinds: SlotKind[]; accepting: boolean }): React.JSX.Element {
  const wide = accepting && kinds.length >= 2;
  return (
    <>
      {kinds.map((kind, index) => {
        if (accepting && index === 0) {
          return (
            <span key={index} className="slot is-drop" style={wide ? { gridColumn: 'span 2' } : undefined}>
              Dépose ici
            </span>
          );
        }
        return wide && index === 1 ? null : (
          <span key={index} className={`slot${kind === 'open' ? '' : ` is-${kind}`}`} />
        );
      })}
    </>
  );
}

// The cards of one side: those whose move is still to come stand at the location they leave.
function useStanding(
  location: number,
  side: Side,
  cards: CardView[],
): { standing: CardView[]; ghosts: CardView[]; row: RowCard[] } {
  const scene = useScene();
  const placements = usePlacements();
  const settled = cards.filter((card) => !scene.unmoved.has(card.uid));
  const departing = departingAt(placements, scene.unmoved, { location, side });
  const standing = [...settled, ...departing];
  const ghosts = ghostsAt(placements, scene.dying, { location, side, present: standing });
  return { standing, ghosts, row: rowWithGhosts(placements, standing, ghosts) };
}

function SideCards({
  location,
  side,
  cards,
  terrain,
  pending,
  pendingCount = 0,
  accepting = false,
}: SideProps): React.JSX.Element {
  const { standing, ghosts, row } = useStanding(location, side, cards);
  const empty = Math.max(0, LOCATION_CAPACITY - standing.length - ghosts.length - pendingCount);
  return (
    <>
      {row.map(({ card, ghost }) => (
        <BoardCard key={card.uid} card={card} own={side === 'you'} ghost={ghost} />
      ))}
      {pending}
      <EmptySlots kinds={emptySlotKinds(empty, terrain)} accepting={accepting} />
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
  const { index } = location;
  const scene = useScene();
  const revealed = location.defId !== null && !scene.hiddenLocations.has(index);
  const terrain = terrainState(
    revealed && location.defId !== null ? catalog.location(location.defId).rules : {},
    view.turn,
  );
  const target: DropTarget = { kind: 'location', index };
  const dragged = useDragged();
  const valid = dragged !== null && canDrop(view, dragged, target);
  const { setNodeRef, isOver } = useDroppable({ id: dropId(target), disabled: !valid });
  const canPlay = selected !== null && canDrop(view, { uid: selected, origin: 'hand' }, target);
  const play = (event: React.MouseEvent): void => {
    event.stopPropagation();
    onPlay(index);
  };
  return (
    <section
      ref={setNodeRef}
      className={`location lead-${leadOf(location.power)}${canPlay ? ' can-play' : ''}${dropClass(dragged !== null, valid, isOver)}`}
      aria-label={`Lieu ${index + 1}`}
      onClick={canPlay ? play : undefined}
    >
      <div className="location-side opponent">
        <SideCards location={index} side="opponent" cards={location.cards.opponent} terrain={terrain} />
      </div>
      <LocationHeader location={location} turn={view.turn} />
      <div className="location-side you">
        <SideCards
          location={index}
          side="you"
          cards={location.cards.you}
          terrain={terrain}
          pendingCount={location.yourPending.length}
          accepting={valid || canPlay}
          pending={location.yourPending.map((card) => (
            <PendingCard key={card.uid} card={card} locked={view.ready} onCancel={onCancel} />
          ))}
        />
        {canPlay && (
          <button type="button" className="play-here btn-arcade" onClick={play}>
            Poser ici
          </button>
        )}
      </div>
    </section>
  );
}
