import type { GameEvent } from '@ytcg-game/engine';
import { describe, expect, it } from 'vitest';
import { readingPauseSeconds, revealCount, scheduleTurn } from '../src/session/turn-clock.ts';

describe('turn clock', () => {
  const timing = { turnSeconds: 60, revealPauseSeconds: 3, revealSecondsPerCard: 2.5, revealPauseMaxSeconds: 20 };

  it('runs the first turn timer at once', () => {
    expect(scheduleTurn(1000, timing, null)).toEqual({ revealUntil: null, deadline: 61_000 });
  });

  it('adds a reading pause proportional to the reveals before the timer of the next turn', () => {
    expect(scheduleTurn(1000, timing, 0)).toEqual({ revealUntil: 4000, deadline: 64_000 });
    expect(scheduleTurn(1000, timing, 4)).toEqual({ revealUntil: 14_000, deadline: 74_000 });
  });

  it('caps the reading pause', () => {
    expect(readingPauseSeconds(timing, 3)).toBe(10.5);
    expect(readingPauseSeconds(timing, 12)).toBe(20);
    expect(scheduleTurn(0, timing, 12)).toEqual({ revealUntil: 20_000, deadline: 80_000 });
  });

  it('has no pause when it is configured to zero', () => {
    const none = { ...timing, revealPauseSeconds: 0, revealSecondsPerCard: 0 };
    expect(scheduleTurn(1000, none, 5)).toEqual({ revealUntil: null, deadline: 61_000 });
  });

  it('counts revealed cards and terrains only', () => {
    const events: GameEvent[] = [
      { type: 'revealPriority', player: 0 },
      { type: 'cardRevealed', card: 'p0c1', defId: 'a', player: 0, location: 0 },
      { type: 'powerChanged', card: 'p0c1', delta: 2 },
      { type: 'cardRevealed', card: 'p1c1', defId: 'b', player: 1, location: 2 },
      { type: 'turnStarted', turn: 3 },
      { type: 'locationRevealed', location: 2 },
    ];
    expect(revealCount(events)).toBe(3);
  });
});
