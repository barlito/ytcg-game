import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import type { CardView } from '@ytcg-game/engine';
import type { ReactNode } from 'react';
import type { CardFx } from '../../animation/fx.ts';
import { useFlight } from '../../lib/flight.ts';
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
  style?: React.CSSProperties;
  onClick?: (() => void) | undefined;
  dragRef?: ((element: HTMLElement | null) => void) | undefined;
  dragListeners?: DraggableSyntheticListeners;
  children: ReactNode;
}

interface RefParts {
  uid: string;
  flight: CardFx['flight'];
  setAnchor: (element: HTMLElement | null) => void;
  dragRef: CardButtonProps['dragRef'];
}

// One ref for the tooltip anchor, the drag handle and the flight (it remembers where the card stood).
function useCardRef({ uid, flight, setAnchor, dragRef }: RefParts): (element: HTMLButtonElement | null) => () => void {
  const flightRef = useFlight(uid, flight);
  return (element) => {
    setAnchor(element);
    dragRef?.(element);
    const leaveFlight = flightRef(element);
    return () => {
      leaveFlight?.();
      setAnchor(null);
      dragRef?.(null);
    };
  };
}

// The focusable shell of a card: tooltip (hover, focus, pin), replay float, optional drag handle.
export function CardButton(props: CardButtonProps): React.JSX.Element {
  const {
    card,
    fx,
    className,
    label,
    pinned = false,
    disabled = false,
    style,
    onClick,
    dragRef,
    dragListeners,
  } = props;
  const { anchor, setAnchor, id, open, handlers } = useTooltipAnchor(pinned);
  const setRef = useCardRef({ uid: card.uid, flight: fx.flight, setAnchor, dragRef });
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
        style={style}
        {...dragListeners}
        {...handlers}
        onClick={onClick}
      >
        {props.children}
        {fx.float !== null && <span className={`fx-float tone-${fx.float.tone}`}>{fx.float.text}</span>}
        {fx.effect === 'burst' && <Particles />}
      </button>
      {showTip && (
        <Tooltip anchor={anchor} id={id}>
          <CardDetails card={card} />
        </Tooltip>
      )}
    </>
  );
}

const PARTICLES = 10;

// Sparks flying out of a card that blows up (CSS only: each one reads its own angle).
function Particles(): React.JSX.Element {
  return (
    <span className="fx-particles" aria-hidden="true">
      {Array.from({ length: PARTICLES }, (_, index) => (
        <span key={index} style={{ '--a': `${String((360 / PARTICLES) * index)}deg` } as React.CSSProperties} />
      ))}
    </span>
  );
}
