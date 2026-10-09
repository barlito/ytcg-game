import { type PlayerEvent, statusRule } from '@ytcg-game/engine';
import { type Queue, type SpotlightEvent, currentStep, isSpotlit, unplayedEvents, upcomingEvents } from './queue.ts';

// What the replay changes on top of the final view.
export interface Scene {
  // The event playing on the board; null while a reveal is spotlighted (it lands at the next step).
  current: PlayerEvent | null;
  spotlight: SpotlightEvent | null;
  // Events still to land, in order (the journal does not print them yet).
  unplayed: readonly PlayerEvent[];
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
  spotlight: null,
  unplayed: [],
  faceDown: new Set(),
  undrawn: new Set(),
  hiddenLocations: new Set(),
  dying: new Set(),
  outcomeHeld: false,
};

function collect<T>(events: readonly PlayerEvent[], pick: (event: PlayerEvent) => T | null): Set<T> {
  return new Set(events.flatMap((event) => pick(event) ?? []));
}

export function isReplaying(scene: Scene): boolean {
  return scene.current !== null || scene.spotlight !== null;
}

export function sceneOf(queue: Queue): Scene {
  const step = currentStep(queue);
  if (step === null) {
    return STILL;
  }
  const upcoming = upcomingEvents(queue);
  const withCurrent = [step.event, ...upcoming];
  const spotlight = step.spotlight === true && isSpotlit(step.event) ? step.event : null;
  return {
    current: spotlight === null ? step.event : null,
    spotlight,
    unplayed: unplayedEvents(queue),
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

type CardEffectEvent = Extract<
  PlayerEvent,
  { type: 'cardRevealed' | 'cardDestroyed' | 'powerChanged' | 'statusChanged' | 'cardDrawn' }
>;

// Moves, cost changes and cards added to hand have no animation yet: the journal line is enough.
function isCardEffectEvent(event: PlayerEvent): event is CardEffectEvent {
  return ['cardRevealed', 'cardDestroyed', 'powerChanged', 'statusChanged', 'cardDrawn'].includes(event.type);
}

function effectOn(event: PlayerEvent, uid: string): Omit<CardFx, 'faceDown'> {
  const none = { effect: null, float: null };
  if (!isCardEffectEvent(event) || event.card !== uid) {
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
