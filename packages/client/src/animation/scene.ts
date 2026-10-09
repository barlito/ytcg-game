import type { PlayerEvent } from '@ytcg-game/engine';
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
  // Own cards drawn or added to hand later in the sequence: not in hand yet.
  undrawn: ReadonlySet<string>;
  // Opponent cards added to their hand later in the sequence: their mini backs are not there yet.
  opponentAdds: number;
  hiddenLocations: ReadonlySet<number>;
  // Destroyed now or later: drawn as ghosts until their destruction played.
  dying: ReadonlySet<string>;
  // Cards moved later in the sequence: still drawn at the location they leave (uid → that location).
  unmoved: ReadonlyMap<string, number>;
  // Cost changes still to come per hand card: the badge keeps the older cost until they play.
  costPending: ReadonlyMap<string, number>;
  // Cards whose crisis is announced later: the Folie pill does not name it yet.
  crisisPending: ReadonlySet<string>;
  // Cards whose Protection breaks now or later: the shield is drawn until then.
  shielded: ReadonlySet<string>;
  // The game end is still to be played: the result waits.
  outcomeHeld: boolean;
}

export const STILL: Scene = {
  current: null,
  spotlight: null,
  unplayed: [],
  faceDown: new Set(),
  undrawn: new Set(),
  opponentAdds: 0,
  hiddenLocations: new Set(),
  dying: new Set(),
  unmoved: new Map(),
  costPending: new Map(),
  crisisPending: new Set(),
  shielded: new Set(),
  outcomeHeld: false,
};

function collect<T>(events: readonly PlayerEvent[], pick: (event: PlayerEvent) => T | null): Set<T> {
  return new Set(events.flatMap((event) => pick(event) ?? []));
}

export function isReplaying(scene: Scene): boolean {
  return scene.current !== null || scene.spotlight !== null;
}

// The first move of each card still to come: where the card still stands.
function firstMoves(events: readonly PlayerEvent[]): Map<string, number> {
  const moves = new Map<string, number>();
  for (const event of events) {
    if (event.type === 'cardMoved' && !moves.has(event.card)) {
      moves.set(event.card, event.from);
    }
  }
  return moves;
}

function pendingCosts(events: readonly PlayerEvent[]): Map<string, number> {
  const costs = new Map<string, number>();
  for (const event of events) {
    if (event.type === 'costChanged' && event.card !== null) {
      costs.set(event.card, (costs.get(event.card) ?? 0) + event.delta);
    }
  }
  return costs;
}

function isShieldBreak(event: PlayerEvent): boolean {
  return event.type === 'statusChanged' && event.status === 'protected' && event.stacks === 0 && event.spent === true;
}

function addedOwnCard(event: PlayerEvent): string | null {
  return event.type === 'cardAddedToHand' ? event.card : null;
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
    undrawn: collect(upcoming, (e) => (e.type === 'cardDrawn' ? e.card : addedOwnCard(e))),
    opponentAdds: upcoming.filter((e) => e.type === 'cardAddedToHand' && e.card === null).length,
    hiddenLocations: collect(upcoming, (e) => (e.type === 'locationRevealed' ? e.location : null)),
    dying: collect(withCurrent, (e) => (e.type === 'cardDestroyed' ? e.card : null)),
    unmoved: firstMoves(upcoming),
    costPending: pendingCosts(upcoming),
    crisisPending: collect(upcoming, (e) => (e.type === 'crisisStarted' ? e.card : null)),
    shielded: collect(withCurrent.filter(isShieldBreak), (e) => (e.type === 'statusChanged' ? e.card : null)),
    outcomeHeld: withCurrent.some((e) => e.type === 'gameEnded'),
  };
}
