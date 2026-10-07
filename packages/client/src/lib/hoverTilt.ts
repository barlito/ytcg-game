import type { PointerEvent } from 'react';

const VARIABLES = ['--rx', '--ry', '--px', '--py'];
const MAX_ROTATE = 10;
const frames = new WeakMap<HTMLElement, number>();

function tiltValues(event: PointerEvent<HTMLElement>, rect: DOMRect): string[] {
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  return [
    `${((0.5 - y) * MAX_ROTATE * 2).toFixed(2)}deg`,
    `${((x - 0.5) * MAX_ROTATE * 2).toFixed(2)}deg`,
    `${(x * 100).toFixed(1)}%`,
    `${(y * 100).toFixed(1)}%`,
  ];
}

function writeTilt(element: HTMLElement, values: string[] | null): void {
  element.classList.toggle('is-tilting', values !== null);
  VARIABLES.forEach((name, index) => {
    const value = values?.[index];
    if (value === undefined) {
      element.style.removeProperty(name);
    } else {
      element.style.setProperty(name, value);
    }
  });
}

// One style write per frame and per card.
function schedule(element: HTMLElement, values: string[] | null): void {
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

// Ported from the hex prototype (useHoverTilt) without React state: CSS variables on the hovered card, mouse only.
export function tiltOnMove(event: PointerEvent<HTMLElement>): void {
  if (event.pointerType === 'mouse') {
    schedule(event.currentTarget, tiltValues(event, event.currentTarget.getBoundingClientRect()));
  }
}

export function tiltOnLeave(event: PointerEvent<HTMLElement>): void {
  schedule(event.currentTarget, null);
}
