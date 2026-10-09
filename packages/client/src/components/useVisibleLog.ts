import type { SeatInfo } from '@ytcg-game/server/protocol';
import { useScene } from '../animation/useReplay.ts';
import { loggedCount } from '../events.ts';

// Lines of events the replay has not played yet stay hidden: the journal never spoils a reveal.
export function useVisibleLog(lines: readonly string[], seats: readonly SeatInfo[]): readonly string[] {
  const held = loggedCount(useScene().unplayed, seats);
  return held === 0 ? lines : lines.slice(0, Math.max(0, lines.length - held));
}
