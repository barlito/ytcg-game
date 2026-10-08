import type { PlayerEvent, PlayerIndex } from '@ytcg-game/engine';

export interface Step {
  event: PlayerEvent;
  // Milliseconds before the next step starts.
  duration: number;
}

// Short on purpose: a full resolution must stay readable within the reading pause.
const DURATIONS: Record<PlayerEvent['type'], number> = {
  turnStarted: 700,
  locationRevealed: 900,
  cardDrawn: 300,
  handRedrawn: 700,
  revealPriority: 900,
  cardRevealed: 550,
  powerChanged: 500,
  cardDestroyed: 650,
  statusChanged: 500,
  gameEnded: 600,
};

const OPPONENT_DRAW = 120;

export function durationOf(event: PlayerEvent, you: PlayerIndex): number {
  if (event.type === 'cardDrawn' && event.player !== you) {
    return OPPONENT_DRAW;
  }
  return DURATIONS[event.type];
}

// Reduced motion: nothing is replayed, the final view shows at once.
export function stepsFor(events: readonly PlayerEvent[], you: PlayerIndex, reducedMotion: boolean): Step[] {
  return reducedMotion ? [] : events.map((event) => ({ event, duration: durationOf(event, you) }));
}

// steps[index] is playing; index === steps.length means idle.
export interface Queue {
  steps: readonly Step[];
  index: number;
}

export const IDLE: Queue = { steps: [], index: 0 };

// Finished steps are dropped, new ones play after the remaining ones.
export function enqueue(queue: Queue, steps: readonly Step[]): Queue {
  if (steps.length === 0) {
    return queue;
  }
  return { steps: [...queue.steps.slice(queue.index), ...steps], index: 0 };
}

export function advance(queue: Queue): Queue {
  const index = queue.index + 1;
  return index >= queue.steps.length ? IDLE : { steps: queue.steps, index };
}

export function currentStep(queue: Queue): Step | null {
  return queue.steps[queue.index] ?? null;
}

// Steps still to come after the current one.
export function upcomingEvents(queue: Queue): PlayerEvent[] {
  return queue.steps.slice(queue.index + 1).map((step) => step.event);
}
