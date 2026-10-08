export type TurnClock = { phase: 'reading'; seconds: number } | { phase: 'turn'; seconds: number } | null;

// The reading pause after a reveal counts down first, then the turn timer.
export function turnClock(now: number, deadline: number | null, revealUntil: number | null): TurnClock {
  if (deadline === null) {
    return null;
  }
  if (revealUntil !== null && now < revealUntil) {
    return { phase: 'reading', seconds: Math.ceil((revealUntil - now) / 1000) };
  }
  return { phase: 'turn', seconds: Math.max(0, Math.ceil((deadline - now) / 1000)) };
}
