import type { PointerEvent } from 'react';
import { holoPose } from './holoPose.ts';

const MAX_ROTATE = 10;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const frames = new WeakMap<HTMLElement, number>();
const written = new WeakMap<HTMLElement, string[]>();

function tiltValues(event: PointerEvent<HTMLElement>, rect: DOMRect): Record<string, string> {
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  return {
    '--rx': `${((0.5 - y) * MAX_ROTATE * 2).toFixed(2)}deg`,
    '--ry': `${((x - 0.5) * MAX_ROTATE * 2).toFixed(2)}deg`,
    '--px': `${(x * 100).toFixed(1)}%`,
    '--py': `${(y * 100).toFixed(1)}%`,
    ...holoPose(x, y),
  };
}

function writeTilt(element: HTMLElement, values: Record<string, string> | null): void {
  element.classList.toggle('is-tilting', values !== null);
  if (values === null) {
    for (const name of written.get(element) ?? []) {
      element.style.removeProperty(name);
    }
    return;
  }
  written.set(element, Object.keys(values));
  for (const [name, value] of Object.entries(values)) {
    element.style.setProperty(name, value);
  }
}

// One style write per frame and per card.
function schedule(element: HTMLElement, values: Record<string, string> | null): void {
  const pending = frames.get(element);
  if (pending !== undefined) {
    cancelAnimationFrame(pending);
  }
  frames.set(
    element,
    requestAnimationFrame(() => {
      frames.delete(element);
      writeTilt(element, values);
    }),
  );
}

// Ported from the hex prototype (useHoverTilt) without React state: CSS variables on the hovered card, mouse only, none under reduced motion.
export function tiltOnMove(event: PointerEvent<HTMLElement>): void {
  if (event.pointerType === 'mouse' && !REDUCED_MOTION.matches) {
    schedule(event.currentTarget, tiltValues(event, event.currentTarget.getBoundingClientRect()));
  }
}

export function tiltOnLeave(event: PointerEvent<HTMLElement>): void {
  schedule(event.currentTarget, null);
}
