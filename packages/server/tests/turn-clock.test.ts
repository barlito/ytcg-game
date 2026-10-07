import { describe, expect, it } from 'vitest';
import { scheduleTurn } from '../src/session/turn-clock.ts';

describe('turn clock', () => {
  const timing = { turnSeconds: 60, revealPauseSeconds: 5 };

  it('runs the first turn timer at once', () => {
    expect(scheduleTurn(1000, timing, false)).toEqual({ revealUntil: null, deadline: 61_000 });
  });

  it('adds the reading pause before the timer of a turn following a resolution', () => {
    expect(scheduleTurn(1000, timing, true)).toEqual({ revealUntil: 6000, deadline: 66_000 });
  });

  it('has no pause when it is configured to zero', () => {
    expect(scheduleTurn(1000, { turnSeconds: 60, revealPauseSeconds: 0 }, true)).toEqual({
      revealUntil: null,
      deadline: 61_000,
    });
  });
});
