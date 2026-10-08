import type { GameEvent } from '@ytcg-game/engine';

export interface TurnTiming {
  turnSeconds: number;
  // Reading pause after a resolution: a base, plus a share per revealed card or terrain, capped.
  revealPauseSeconds: number;
  revealSecondsPerCard: number;
  revealPauseMaxSeconds: number;
}

export interface TurnSchedule {
  // Epoch milliseconds: end of the reading pause (null without one) and automatic end of the turn.
  revealUntil: number | null;
  deadline: number;
}

// Cards and terrains the clients spotlight one after the other.
export function revealCount(events: readonly GameEvent[]): number {
  return events.filter((event) => event.type === 'cardRevealed' || event.type === 'locationRevealed').length;
}

export function readingPauseSeconds(timing: TurnTiming, reveals: number): number {
  const wanted = timing.revealPauseSeconds + Math.max(0, reveals) * timing.revealSecondsPerCard;
  return Math.max(0, Math.min(wanted, timing.revealPauseMaxSeconds));
}

// A turn that follows a resolution (reveals !== null) starts with a reading pause, its timer only runs afterwards.
export function scheduleTurn(now: number, timing: TurnTiming, reveals: number | null): TurnSchedule {
  const pause = reveals === null ? 0 : readingPauseSeconds(timing, reveals) * 1000;
  return {
    revealUntil: pause > 0 ? now + pause : null,
    deadline: now + pause + timing.turnSeconds * 1000,
  };
}
