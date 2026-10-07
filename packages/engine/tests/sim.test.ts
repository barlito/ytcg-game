import { describe, expect, it } from 'vitest';
import { Rng } from '../src/index.ts';
import { loadDataDir } from '../src/sim/data.ts';
import { simulate } from '../src/sim/simulate.ts';

describe('rng', () => {
  it('is reproducible and shuffles into a permutation', () => {
    const a = new Rng({ s: 42 });
    const b = new Rng({ s: 42 });
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
    expect(new Rng({ s: 7 }).shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(() => a.pick([])).toThrow(RangeError);
  });
});

describe('bot simulation', () => {
  const catalog = loadDataDir();

  it.each(['random', 'universe'] as const)('plays %s-deck games to the end, reproducibly', (mode) => {
    const report = simulate(catalog, { games: 20, seed: 'ci', mode });
    expect(report.seatWins[0] + report.seatWins[1] + report.draws).toBe(20);
    expect(report.averageCardsPlayed).toBeGreaterThan(0);

    const again = simulate(catalog, { games: 20, seed: 'ci', mode });
    expect(again.seatWins).toEqual(report.seatWins);
    expect(again.cards).toEqual(report.cards);
  });
});
