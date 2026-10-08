import { useDroppable } from '@dnd-kit/core';
import type { PlayerView } from '@ytcg-game/engine';
import { useScene } from '../animation/useReplay.ts';
import { canDrop, dropId } from '../dnd.ts';
import { HandCard } from './card/BoardCards.tsx';
import { useDragged } from './dnd/DragContext.ts';

interface Props {
  view: PlayerView;
  selected: string | null;
  onSelect: (uid: string | null) => void;
}

// Also the drop zone taking back a face-down card of this turn.
export function HandBar({ view, selected, onSelect }: Props): React.JSX.Element {
  const scene = useScene();
  const dragged = useDragged();
  const takesBack = dragged !== null && canDrop(view, dragged, { kind: 'hand' });
  const { setNodeRef, isOver } = useDroppable({ id: dropId({ kind: 'hand' }), disabled: !takesBack });
  const redrawing = scene.current?.type === 'handRedrawn' && scene.current.player === view.you;
  const classes = [
    'hand',
    takesBack ? 'drop-valid' : '',
    takesBack && isOver ? 'drop-over' : '',
    redrawing ? 'fx-shuffle' : '',
  ];
  return (
    <div ref={setNodeRef} className={classes.join(' ')} aria-label="Ta main" data-count={view.hand.length}>
      {takesBack && <p className="hand-hint">Lâche ici pour reprendre la carte</p>}
      {view.hand
        .filter((card) => !scene.undrawn.has(card.uid))
        .map((card) => (
          <HandCard
            key={card.uid}
            card={card}
            playable={view.playableCards.includes(card.uid)}
            selected={selected === card.uid}
            onSelect={onSelect}
          />
        ))}
      {view.hand.length === 0 && <p className="hand-empty">Main vide</p>}
    </div>
  );
}
