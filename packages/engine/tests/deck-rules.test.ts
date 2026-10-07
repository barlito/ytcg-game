import { describe, expect, it } from 'vitest';
import {
  DECK_SIZE,
  type GameState,
  IllegalActionError,
  OPENING_CARDS,
  OPENING_COST,
  Rng,
  applyAction,
  buildRandomDeck,
  createGame,
  deckCurveIssues,
  guaranteeOpening,
  projectEventsForPlayer,
  projectForPlayer,
  validateDeck,
} from '../src/index.ts';
import { loadDataDir } from '../src/sim/data.ts';
import { card, catalogWith, deckOf, newGame } from './support.ts';

const real = loadDataDir();

describe('deck curve', () => {
  const catalog = catalogWith([
    card('cheap-a'),
    card('cheap-b'),
    card('big-a', { cost: 6 }),
    card('big-b', { cost: 6 }),
  ]);

  it('requires cards at each low cost and caps the expensive ones', () => {
    expect(deckCurveIssues(catalog, deckOf())).toEqual([]);
    const noTwos = deckOf().filter((id) => !id.startsWith('filler-2-'));
    expect(deckCurveIssues(catalog, noTwos)).toEqual(['a deck needs at least 2 cards costing 2']);
    const expensive = ['big-a', 'big-b', ...deckOf()].slice(0, DECK_SIZE);
    expect(deckCurveIssues(catalog, expensive)).toEqual([]);
  });

  it('is part of the deck validation', () => {
    const noOnes = [...deckOf().filter((id) => !id.startsWith('filler-1-')), 'filler-4-11', 'filler-4-12'];
    expect(validateDeck(catalog, noOnes)).toContain('a deck needs at least 2 cards costing 1');
  });
});

describe('random legal decks', () => {
  it('always respects the curve on the real catalog', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const deck = buildRandomDeck(real, new Rng({ s: seed }));
      expect(deck).not.toBeNull();
      expect(validateDeck(real, deck ?? [])).toEqual([]);
    }
  });

  it('gives up when the pool cannot build one', () => {
    const tooFew = [...real.cards.values()].filter((c) => c.cost >= 4).map((c) => c.id);
    expect(buildRandomDeck(real, new Rng({ s: 1 }), tooFew)).toBeNull();
  });
});

describe('guaranteed opening', () => {
  it('brings a cheap card into the opening when there is none', () => {
    const cards = [5, 5, 5, 5, 5, 1];
    guaranteeOpening(cards, (cost) => cost, OPENING_CARDS, new Rng({ s: 3 }));
    expect(cards.slice(0, OPENING_CARDS)).toContain(OPENING_COST);
    expect([...cards].sort()).toEqual([1, 5, 5, 5, 5, 5]);
  });

  it('shows a card costing 1 in the first hand of every real game', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const rng = new Rng({ s: seed });
      const { state } = createGame(real, {
        seed: `opening:${seed}`,
        players: [
          { id: 'a', deck: buildRandomDeck(real, rng) ?? [] },
          { id: 'b', deck: buildRandomDeck(real, rng) ?? [] },
        ],
      });
      for (const player of state.players) {
        expect(player.hand.some((uid) => real.card(state.cards[uid]?.defId ?? '').cost === OPENING_COST)).toBe(true);
      }
    }
  });
});

describe('mulligan', () => {
  const catalog = catalogWith([card('one')]);

  it('redraws the whole hand once, on turn 1, before playing', () => {
    const state = newGame(catalog, { energy: 1 });
    const before = state.players[0].hand.length;
    const { state: after, events } = applyAction(catalog, state, { type: 'mulligan', player: 0 });

    expect(after.players[0].hand).toHaveLength(before);
    expect(after.players[0].deck.length + after.players[0].hand.length).toBe(DECK_SIZE);
    expect(events).toContainEqual({ type: 'handRedrawn', player: 0 });
    expect(projectForPlayer(catalog, after, 0).canMulligan).toBe(false);
    expect(() => applyAction(catalog, after, { type: 'mulligan', player: 0 })).toThrow(IllegalActionError);
  });

  it('is refused after a play or after turn 1', () => {
    const state = newGame(catalog, { p0: ['one'] });
    const played = applyAction(catalog, state, {
      type: 'play',
      player: 0,
      card: state.players[0].hand.at(-1) ?? '',
      location: 0,
    }).state;
    expect(() => applyAction(catalog, played, { type: 'mulligan', player: 0 })).toThrow(IllegalActionError);
  });

  it('only tells the opponent that a hand was redrawn', () => {
    const state = newGame(catalog);
    const { events } = applyAction(catalog, state, { type: 'mulligan', player: 0 });
    const seen = projectEventsForPlayer(events, 1);
    expect(seen.filter((event) => event.type === 'cardDrawn').every((event) => event.card === null)).toBe(true);
  });
});

describe('location cards', () => {
  const catalog = catalogWith(
    [],
    [
      { id: 'loc-d', name: 'loc-d' },
      { id: 'loc-e', name: 'loc-e' },
    ],
  );
  const setup = (seed: string): GameState =>
    createGame(catalog, {
      seed,
      players: [
        { id: 'alice', deck: deckOf(), location: 'loc-d' },
        { id: 'bob', deck: deckOf(), location: 'loc-e' },
      ],
    }).state;

  it('places both chosen locations and one random, in a random order', () => {
    const orders = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const { locations } = setup(`places:${i}`);
      const ids = locations.map((location) => location.defId);
      expect(ids).toContain('loc-d');
      expect(ids).toContain('loc-e');
      expect(new Set(ids).size).toBe(3);
      expect(locations.find((l) => l.defId === 'loc-d')?.chosenBy).toBe(0);
      expect(locations.filter((l) => l.chosenBy === null)).toHaveLength(1);
      orders.add(ids.join());
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('tells each player whose location it is once revealed', () => {
    const state = setup('owner');
    const first = state.locations[0];
    const view = projectForPlayer(catalog, state, 1).locations[0];
    const expected = first?.chosenBy === null ? null : first?.chosenBy === 1 ? 'you' : 'opponent';
    expect(view?.chosenBy).toBe(expected);
    expect(projectForPlayer(catalog, state, 1).locations[2]?.chosenBy).toBeNull();
  });

  it('refuses an unknown location card', () => {
    expect(() =>
      createGame(catalog, {
        seed: 'x',
        players: [
          { id: 'alice', deck: deckOf(), location: 'nowhere' },
          { id: 'bob', deck: deckOf() },
        ],
      }),
    ).toThrow(/unknown location nowhere/);
  });
});
