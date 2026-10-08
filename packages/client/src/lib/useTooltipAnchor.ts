import { type FocusEvent, useId, useState } from 'react';

export interface TooltipAnchor {
  // The anchor element, set through `setAnchor` (a callback ref).
  anchor: HTMLElement | null;
  setAnchor: (element: HTMLElement | null) => void;
  id: string;
  open: boolean;
  // Spread on the anchor element.
  handlers: {
    onPointerEnter: (event: { pointerType: string }) => void;
    onPointerLeave: () => void;
    onPointerUp: (event: { pointerType: string }) => void;
    onFocus: (event: FocusEvent) => void;
    onBlur: () => void;
  };
}

// Mouse hover, keyboard focus, a tap on touch screens (until the next tap or blur) or `pinned` open the tooltip.
export function useTooltipAnchor(pinned: boolean): TooltipAnchor {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tapped, setTapped] = useState(false);
  const handlers: TooltipAnchor['handlers'] = {
    onPointerEnter: (event) => {
      setHovered(event.pointerType === 'mouse');
    },
    onPointerLeave: () => {
      setHovered(false);
    },
    onPointerUp: (event) => {
      if (event.pointerType !== 'mouse') {
        setTapped((current) => !current);
      }
    },
    onFocus: (event) => {
      setFocused(event.target.matches(':focus-visible'));
    },
    onBlur: () => {
      setFocused(false);
      setTapped(false);
    },
  };
  return { anchor, setAnchor, id, open: hovered || focused || tapped || pinned, handlers };
}
