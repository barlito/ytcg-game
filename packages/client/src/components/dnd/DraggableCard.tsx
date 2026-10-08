import { useDraggable } from '@dnd-kit/core';
import type { CardView } from '@ytcg-game/engine';
import type { DraggedCard } from '../../dnd.ts';
import { CardButton, type CardButtonProps } from '../card/CardButton.tsx';

type Props = Omit<CardButtonProps, 'dragRef' | 'dragListeners'> & {
  dragged: DraggedCard;
  card: CardView;
  draggable: boolean;
};

// A card that can also be dragged (hand card to a location, face-down card back to the hand).
export function DraggableCard({ dragged, draggable, ...button }: Props): React.JSX.Element {
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `${dragged.origin}:${dragged.uid}`,
    data: { drag: { dragged, card: button.card } },
    disabled: !draggable,
  });
  return (
    <CardButton
      {...button}
      className={`${button.className}${isDragging ? ' is-dragging' : ''}${draggable ? ' is-draggable' : ''}`}
      dragRef={setNodeRef}
      dragListeners={draggable ? listeners : undefined}
    />
  );
}
