import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  anchor: HTMLElement | null;
  id: string;
  // Centred at the top of the screen instead of next to the anchor.
  docked?: boolean;
  children: ReactNode;
}

const GAP = 8;
const MARGIN = 8;

// Above the anchor when it fits, below otherwise, always inside the viewport.
export function placeTooltip(
  anchor: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>,
  tip: Pick<DOMRect, 'width' | 'height'>,
  viewport: { width: number; height: number },
): { left: number; top: number } {
  const above = anchor.top - GAP - tip.height;
  const top = above >= MARGIN ? above : Math.min(anchor.bottom + GAP, viewport.height - tip.height - MARGIN);
  const centered = anchor.left + anchor.width / 2 - tip.width / 2;
  const left = Math.max(MARGIN, Math.min(centered, viewport.width - tip.width - MARGIN));
  return { left, top: Math.max(MARGIN, top) };
}

export function placeDocked(tip: Pick<DOMRect, 'width'>, viewport: { width: number }): { left: number; top: number } {
  return { left: Math.max(MARGIN, (viewport.width - tip.width) / 2), top: MARGIN };
}

// Rendered in <body>: never clipped by the board and never tilted with the card.
export function Tooltip({ anchor, id, docked = false, children }: Props): React.JSX.Element {
  const measure = (tip: HTMLDivElement | null): void => {
    if (tip === null || anchor === null) {
      return;
    }
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const box = tip.getBoundingClientRect();
    const { left, top } = docked
      ? placeDocked(box, viewport)
      : placeTooltip(anchor.getBoundingClientRect(), box, viewport);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.style.visibility = 'visible';
  };
  return createPortal(
    <div ref={measure} id={id} role="tooltip" className="tooltip">
      {children}
    </div>,
    document.body,
  );
}
