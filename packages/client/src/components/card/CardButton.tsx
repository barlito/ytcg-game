import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import type { CardView } from '@ytcg-game/engine';
import type { ReactNode } from 'react';
import type { CardFx } from '../../animation/scene.ts';
import { useTooltipAnchor } from '../../lib/useTooltipAnchor.ts';
import { Tooltip } from '../Tooltip.tsx';
import { CardDetails } from './CardDetails.tsx';

export interface CardButtonProps {
  card: CardView;
  fx: CardFx;
  className: string;
  label: string;
  // Keeps the tooltip open (selected card, tap on touch screens).
  pinned?: boolean;
  disabled?: boolean;
  onClick?: (() => void) | undefined;
  dragRef?: ((element: HTMLElement | null) => void) | undefined;
  dragListeners?: DraggableSyntheticListeners;
  children: ReactNode;
}

// The focusable shell of a card: tooltip (hover, focus, pin), replay float, optional drag handle.
export function CardButton(props: CardButtonProps): React.JSX.Element {
  const { card, fx, className, label, pinned = false, disabled = false, onClick, dragRef, dragListeners } = props;
  const { anchor, setAnchor, id, open, handlers } = useTooltipAnchor(pinned);
  const setRef = (element: HTMLButtonElement | null): void => {
    setAnchor(element);
    dragRef?.(element);
  };
  const showTip = open && !fx.faceDown;
  return (
    <>
      <button
        ref={setRef}
        type="button"
        className={`card-slot ${className}`}
        data-uid={card.uid}
        aria-label={label}
        aria-describedby={showTip ? id : undefined}
        aria-disabled={disabled}
        {...dragListeners}
        {...handlers}
        onClick={onClick}
      >
        {props.children}
        {fx.float !== null && <span className={`fx-float tone-${fx.float.tone}`}>{fx.float.text}</span>}
      </button>
      {showTip && (
        <Tooltip anchor={anchor} id={id}>
          <CardDetails card={card} />
        </Tooltip>
      )}
    </>
  );
}
