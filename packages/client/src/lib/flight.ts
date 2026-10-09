import { useCallback } from 'react';
import type { Flight } from '../animation/fx.ts';

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const FLIGHT_MS = 450;
export const ADD_FLIGHT_MS = 650;

// Offset of the centre of `from` relative to the centre of `to`, and the size ratio.
export function flightDelta(from: Box, to: Box): { dx: number; dy: number; scale: number } {
  return {
    dx: from.left + from.width / 2 - (to.left + to.width / 2),
    dy: from.top + from.height / 2 - (to.top + to.height / 2),
    scale: to.width === 0 ? 1 : from.width / to.width,
  };
}

// Higher for a longer trip, capped: the card hops over the board instead of sliding through it.
export function arcLift(distance: number): number {
  return Math.min(48, Math.max(14, distance * 0.18));
}

// FLIP keyframes using the individual `translate` / `scale` properties, so the card keeps its own `transform` (fan pose).
export function flightFrames(from: Box, to: Box): Keyframe[] {
  const { dx, dy, scale } = flightDelta(from, to);
  const lift = arcLift(Math.hypot(dx, dy));
  const mid = (1 + scale) / 2 + 0.06;
  return [
    { translate: `${dx}px ${dy}px`, scale: String(scale), zIndex: '40' },
    { translate: `${dx / 2}px ${dy / 2 - lift}px`, scale: String(mid), zIndex: '40', offset: 0.5 },
    { translate: '0px 0px', scale: '1', zIndex: '40' },
  ];
}

// Where each card stood when it left the screen: the next element with that uid flies from there.
const lastBoxes = new Map<string, Box>();
const flown = new WeakSet<Element>();

function boxOf(element: Element): Box {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left, top, width, height };
}

function originOf(uid: string, flight: Flight): Box | null {
  if (flight.kind === 'move') {
    return lastBoxes.get(uid) ?? null;
  }
  const source = flight.from === null ? null : document.querySelector(`[data-uid="${flight.from}"]`);
  const deck = document.querySelector('[data-deck]');
  const origin = source ?? deck;
  return origin === null ? null : boxOf(origin);
}

function play(element: HTMLElement, uid: string, flight: Flight): void {
  const from = originOf(uid, flight);
  if (from === null || flown.has(element) || typeof element.animate !== 'function') {
    return;
  }
  flown.add(element);
  const duration = flight.kind === 'move' ? FLIGHT_MS : ADD_FLIGHT_MS;
  element.animate(flightFrames(from, boxOf(element)), { duration, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)' });
}

// Ref callback of a card: remembers where it was when it unmounts, and flies it in when the replay says so.
export function useFlight(
  uid: string,
  flight: Flight | null,
): (element: HTMLElement | null) => (() => void) | undefined {
  const kind = flight?.kind ?? null;
  const from = flight?.kind === 'add' ? flight.from : null;
  return useCallback(
    (element: HTMLElement | null) => {
      if (element === null) {
        return undefined;
      }
      if (kind === 'move') {
        play(element, uid, { kind });
      } else if (kind === 'add') {
        play(element, uid, { kind, from });
      }
      return () => {
        lastBoxes.set(uid, boxOf(element));
      };
    },
    [uid, kind, from],
  );
}
