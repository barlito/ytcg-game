import { type PlayerEvent, statusRule } from '@ytcg-game/engine';
import { type Queue, currentStep, upcomingEvents } from './queue.ts';

// What the replay changes on top of the final view.
export interface Scene {
  current: PlayerEvent | null;
  // Cards revealed later in the sequence: still face down.
  faceDown: ReadonlySet<string>;
  // Own draws still to come: not in hand yet.
  undrawn: ReadonlySet<string>;
  hiddenLocations: ReadonlySet<number>;
  // Destroyed now or later: drawn as ghosts until their destruction played.
  dying: ReadonlySet<string>;
  // The game end is still to be played: the result waits.
  outcomeHeld: boolean;
}

export const STILL: Scene = {
  current: null,
  faceDown: new Set(),
  undrawn: new Set(),
  hiddenLocations: new Set(),
  dying: new Set(),
  outcomeHeld: false,
};

function collect<T>(events: readonly PlayerEvent[], pick: (event: PlayerEvent) => T | null): Set<T> {
  return new Set(events.flatMap((event) => pick(event) ?? []));
}

export function sceneOf(queue: Queue): Scene {
  const current = currentStep(queue)?.event ?? null;
  if (current === null) {
    return STILL;
  }
  const upcoming = upcomingEvents(queue);
  const withCurrent = [current, ...upcoming];
  return {
    current,
    faceDown: collect(upcoming, (e) => (e.type === 'cardRevealed' ? e.card : null)),
    undrawn: collect(upcoming, (e) => (e.type === 'cardDrawn' ? e.card : null)),
    hiddenLocations: collect(upcoming, (e) => (e.type === 'locationRevealed' ? e.location : null)),
    dying: collect(withCurrent, (e) => (e.type === 'cardDestroyed' ? e.card : null)),
    outcomeHeld: withCurrent.some((e) => e.type === 'gameEnded'),
  };
}

export type CardEffect = 'reveal' | 'destroy' | 'power-up' | 'power-down' | 'status' | 'draw';

export interface CardFx {
  faceDown: boolean;
  effect: CardEffect | null;
  float: { text: string; tone: string } | null;
}

function signed(delta: number): string {
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`;
}

function statusFloat(event: Extract<PlayerEvent, { type: 'statusChanged' }>): string {
  const { name } = statusRule(event.status);
  if (event.stacks === 0) {
    return `− ${name}`;
  }
  return event.stacks > 1 ? `${name} ×${event.stacks}` : name;
}

function effectOn(event: PlayerEvent, uid: string): Omit<CardFx, 'faceDown'> {
  const none = { effect: null, float: null };
  if (!('card' in event) || event.card !== uid) {
    return none;
  }
  switch (event.type) {
    case 'cardRevealed':
      return { effect: 'reveal', float: null };
    case 'cardDestroyed':
      return { effect: 'destroy', float: { text: 'Détruite', tone: 'down' } };
    case 'powerChanged':
      return {
        effect: event.delta > 0 ? 'power-up' : 'power-down',
        float: { text: signed(event.delta), tone: event.delta > 0 ? 'up' : 'down' },
      };
    case 'statusChanged':
      return { effect: 'status', float: { text: statusFloat(event), tone: `status-${event.status}` } };
    case 'cardDrawn':
      return { effect: 'draw', float: null };
  }
}

// How one card looks at this point of the replay.
export function cardFx(scene: Scene, uid: string): CardFx {
  const playing = scene.current === null ? { effect: null, float: null } : effectOn(scene.current, uid);
  return { faceDown: scene.faceDown.has(uid), ...playing };
}
