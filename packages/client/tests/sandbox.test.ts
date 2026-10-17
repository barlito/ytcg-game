import { describe, expect, it } from 'vitest';
import { catalog } from '../src/catalog.ts';
import { canDrop } from '../src/dnd.ts';
import { DEFAULT_OPTIONS, buildFixture } from '../src/sandbox/fixture.ts';
import { registerSandboxTerrains } from '../src/sandbox/terrains.ts';

describe('sandbox fixture', () => {
  const game = buildFixture(catalog, DEFAULT_OPTIONS, 1_000);

  it('only references cards and locations of the catalog', () => {
    const cards = game.view.locations.flatMap((l) => [...l.cards.you, ...l.cards.opponent, ...l.yourPending]);
    for (const card of [...cards, ...game.view.hand]) {
      expect(catalog.card(card.defId).cost).toBe(card.cost);
    }
    for (const location of game.view.locations) {
      expect(catalog.location(location.defId ?? '').name).not.toBe('');
    }
  });

  it('shows full locations, a fresh card, and playable cards that fit the energy', () => {
    const [first] = game.view.locations;
    expect(first?.cards.you).toHaveLength(4);
    expect(first?.cards.opponent).toHaveLength(4);
    expect(game.view.locations.flatMap((l) => l.yourPending)).toHaveLength(1);
    const left = game.view.energy - game.view.spent;
    for (const uid of game.view.playableCards) {
      expect(game.view.hand.find((card) => card.uid === uid)?.cost).toBeLessThanOrEqual(left);
    }
    expect(game.view.hand.some((card) => card.cost > left)).toBe(true);
  });

  it('honours the hand size and the turn', () => {
    const small = buildFixture(catalog, { ...DEFAULT_OPTIONS, handCount: 2, turn: 6 }, 0);
    expect(small.view.hand).toHaveLength(2);
    expect(small.view.turn).toBe(6);
  });

  it.each([
    ['win', 0],
    ['loss', 1],
    ['draw', null],
  ] as const)('builds a consistent %s ending', (ending, winner) => {
    const over = buildFixture(catalog, { ...DEFAULT_OPTIONS, ending }, 0);
    expect(over.outcome).toEqual({ winner, reason: 'score' });
    expect(over.view.result?.winner).toBe(winner);
    expect(over.turnDeadline).toBeNull();
  });

  it('adds a reveal event only for the replay', () => {
    expect(game.events).toHaveLength(0);
    expect(buildFixture(catalog, { ...DEFAULT_OPTIONS, replay: true }, 0).events).toHaveLength(1);
  });
});

describe('sandbox terrains', () => {
  registerSandboxTerrains(catalog);

  it('takes the closed and not yet open terrains out of the open locations', () => {
    const base = buildFixture(catalog, DEFAULT_OPTIONS, 0).view;
    const { view } = buildFixture(catalog, { ...DEFAULT_OPTIONS, scenario: 'terrain-closed' }, 0);
    expect(base.openLocations).toContain(1);
    expect(base.openLocations).toContain(2);
    expect(view.openLocations).not.toContain(1);
    expect(view.openLocations).not.toContain(2);
    for (const uid of view.playableCards) {
      expect(canDrop(view, { uid, origin: 'hand' }, { kind: 'location', index: 1 })).toBe(false);
      expect(canDrop(view, { uid, origin: 'hand' }, { kind: 'location', index: 2 })).toBe(false);
    }
  });

  it('keeps a terrain with fewer places open while it has room', () => {
    const { view } = buildFixture(catalog, { ...DEFAULT_OPTIONS, scenario: 'terrain-three' }, 0);
    const third = view.locations[2];
    const room = (third?.cards.you.length ?? 0) + (third?.yourPending.length ?? 0) < 3;
    expect(view.openLocations.includes(2)).toBe(room);
  });
});
