import type { PlayerEvent, PlayerIndex } from '@ytcg-game/engine';

export interface Step {
  event: PlayerEvent;
  // Milliseconds before the next step starts.
  duration: number;
  // The enlarged card or terrain shown before it lands on the board (followed by the landing step of the same event).
  spotlight?: boolean;
}

export type SpotlightEvent = Extract<PlayerEvent, { type: 'cardRevealed' | 'locationRevealed' }>;

// Enlarged sequence of each reveal (rise, flip, effect panel, power counter, flight to the board); with the landing
// step it stays under the 5 s the server pause gives per reveal.
export const SPOTLIGHT_MS = 4400;

// Short on purpose: a full resolution must stay readable within the reading pause.
const DURATIONS: Record<PlayerEvent['type'], number> = {
  turnStarted: 700,
  locationRevealed: 600,
  cardDrawn: 300,
  handRedrawn: 700,
  revealPriority: 900,
  cardRevealed: 550,
  powerChanged: 500,
  cardDestroyed: 800,
  cardMoved: 700,
  costChanged: 650,
  cardAddedToHand: 750,
  statusChanged: 500,
  crisisStarted: 950,
  contagionSpread: 750,
  abilityTriggered: 450,
  gameEnded: 600,
};

const OPPONENT_DRAW = 120;
const OPPONENT_ADD = 450;
const SHIELD_BREAK = 650;

export function durationOf(event: PlayerEvent, you: PlayerIndex): number {
  if (event.type === 'cardDrawn' && event.player !== you) {
    return OPPONENT_DRAW;
  }
  if (event.type === 'cardAddedToHand' && event.player !== you) {
    return OPPONENT_ADD;
  }
  if (event.type === 'statusChanged' && event.spent === true) {
    return SHIELD_BREAK;
  }
  return DURATIONS[event.type];
}

export function isSpotlit(event: PlayerEvent): event is SpotlightEvent {
  return event.type === 'cardRevealed' || event.type === 'locationRevealed';
}

function stepsOf(event: PlayerEvent, you: PlayerIndex): Step[] {
  const landing = { event, duration: durationOf(event, you) };
  return isSpotlit(event) ? [{ event, duration: SPOTLIGHT_MS, spotlight: true }, landing] : [landing];
}

// The engine announces onDestroyed after the destruction: the card must light up while it is still there.
export function lightBeforeDestruction(events: readonly PlayerEvent[]): PlayerEvent[] {
  const ordered = [...events];
  for (let i = 1; i < ordered.length; i++) {
    const previous = ordered[i - 1];
    const event = ordered[i];
    if (
      previous?.type === 'cardDestroyed' &&
      event?.type === 'abilityTriggered' &&
      event.trigger === 'onDestroyed' &&
      event.card === previous.card
    ) {
      ordered[i - 1] = event;
      ordered[i] = previous;
    }
  }
  return ordered;
}

// Reduced motion: nothing is replayed, the final view shows at once (no spotlight either).
export function stepsFor(events: readonly PlayerEvent[], you: PlayerIndex, reducedMotion: boolean): Step[] {
  return reducedMotion ? [] : lightBeforeDestruction(events).flatMap((event) => stepsOf(event, you));
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

// Events not landed yet (a spotlighted reveal lands at its next step): the log holds them back.
export function unplayedEvents(queue: Queue): PlayerEvent[] {
  return queue.steps
    .slice(queue.index + 1)
    .filter((step) => step.spotlight !== true)
    .map((step) => step.event);
}
