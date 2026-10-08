export interface TurnTiming {
  turnSeconds: number;
  revealPauseSeconds: number;
}

export interface TurnSchedule {
  // Epoch milliseconds: end of the reading pause (null without one) and automatic end of the turn.
  revealUntil: number | null;
  deadline: number;
}

// A turn that follows a resolution starts with a reading pause, its timer only runs afterwards.
export function scheduleTurn(now: number, timing: TurnTiming, afterResolution: boolean): TurnSchedule {
  const pause = afterResolution ? Math.max(0, timing.revealPauseSeconds) * 1000 : 0;
  return {
    revealUntil: pause > 0 ? now + pause : null,
    deadline: now + pause + timing.turnSeconds * 1000,
  };
}
