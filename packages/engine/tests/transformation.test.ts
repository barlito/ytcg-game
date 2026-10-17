import { describe, expect, it } from 'vitest';
import {
  CatalogError,
  Rng,
  checkInvariants,
  createGame,
  describeCard,
  projectEventsForPlayer,
  projectForPlayer,
} from '../src/index.ts';
import { playRandomTurn } from '../src/sim/bot.ts';
import {
  type CardInput,
  type LocationInput,
  card,
  catalogWith,
  deckOf,
  newGame,
  playTurn,
  powerAt,
  skipToTurn,
  uidOf,
} from './support.ts';

const evolved = (id: string, overrides: Partial<CardInput> = {}): CardInput =>
  card(id, { deckable: false, ...overrides });

const catalog = catalogWith([
  card('veteran', {
    abilities: [
      { trigger: 'endOfTurn', condition: { type: 'turnsOnBoard', min: 2 }, effect: { type: 'addPower', amount: 5 } },
    ],
  }),
  // Transformations
  card('barlito', {
    name: 'Barlito',
    abilities: [
      { trigger: 'endOfTurn', condition: { type: 'turn', min: 3 }, effect: { type: 'transform', into: 'bankai' } },
    ],
  }),
  evolved('bankai', {
    name: 'Barlito Bankai',
    power: 8,
    statuses: ['tough'],
    abilities: [
      { trigger: 'onReveal', target: { type: 'cards' }, effect: { type: 'addPower', amount: 1 } },
      { trigger: 'endOfTurn', effect: { type: 'addPower', amount: 10 } },
    ],
  }),
  card('larva', {
    abilities: [
      {
        trigger: 'onReveal',
        effect: [
          { type: 'addPower', amount: 2 },
          { type: 'addStatus', status: 'protected' },
        ],
      },
      {
        trigger: 'endOfTurn',
        condition: { type: 'turnsOnBoard', min: 2 },
        effect: { type: 'transform', into: 'moth' },
      },
      { trigger: 'endOfTurn', effect: { type: 'addPower', amount: 100 } },
    ],
  }),
  evolved('moth', { power: 6, statuses: ['protected'] }),
  card('flip', { abilities: [{ trigger: 'onReveal', effect: { type: 'transform', into: 'flop' } }] }),
  evolved('flop', { power: 3, abilities: [{ trigger: 'onReveal', effect: { type: 'transform', into: 'flip' } }] }),
  card('cocoon', {
    abilities: [{ trigger: 'onCardPlayedHere', played: { side: 'ally' }, effect: { type: 'transform', into: 'moth' } }],
  }),
  card('sentinel', { abilities: [{ trigger: 'onCardPlayedHere', effect: { type: 'addPower', amount: 1 } }] }),
  card('phoenix', { abilities: [{ trigger: 'onReveal', effect: { type: 'transform', into: 'phoenix-x' } }] }),
  evolved('phoenix-x', { power: 5, abilities: [{ trigger: 'onReveal', effect: { type: 'addToHand' } }] }),
  card('v1'),
  card('patient', {
    abilities: [
      { trigger: 'ongoing', condition: { type: 'turnsOnBoard', min: 1 }, effect: { type: 'addPower', amount: 2 } },
    ],
  }),
]);

function issuesOf(cards: CardInput[], locations: LocationInput[] = []): readonly string[] {
  try {
    catalogWith(cards, locations);
  } catch (error) {
    expect(error).toBeInstanceOf(CatalogError);
    return (error as CatalogError).issues;
  }
  throw new Error('expected a CatalogError');
}

describe('condition turnsOnBoard', () => {
  it('counts the turns started since the reveal', () => {
    const state = newGame(catalog, { p0: ['veteran'] });
    const turn1 = playTurn(catalog, state, { p0: [['veteran', 0]] }).state;
    expect(turn1.cards[uidOf(turn1, 0, 'veteran')]?.revealedTurn).toBe(1);
    const turn2 = playTurn(catalog, turn1).state;
    expect(powerAt(catalog, turn2, 0, 'veteran')).toBe(1);
    // End of turn 3: two turns after the reveal.
    const turn3 = playTurn(catalog, turn2).state;
    expect(powerAt(catalog, turn3, 0, 'veteran')).toBe(1 + 5);
  });

  it('works on an ongoing ability, from the turn after the reveal', () => {
    const state = newGame(catalog, { p0: ['patient'] });
    const turn1 = playTurn(catalog, state, { p0: [['patient', 0]] }).state;
    expect(powerAt(catalog, turn1, 0, 'patient')).toBe(1 + 2);
    // turn1 is the state at the start of turn 2: one turn after the reveal.
    expect(turn1.turn).toBe(2);
  });

  it('is refused on a terrain and written in French', () => {
    const terrain: LocationInput = {
      id: 'loc-x',
      name: 'x',
      abilities: [
        {
          trigger: 'endOfTurn',
          condition: { type: 'turnsOnBoard', min: 1 },
          target: { type: 'cards', side: 'all' },
          effect: { type: 'addPower', amount: 1 },
        },
      ],
    };
    expect(issuesOf([], [terrain]).join()).toContain('turnsOnBoard');
    expect(describeCard(catalog, catalog.card('veteran'))).toEqual([
      'En fin de tour : après 2 tours en jeu, +5 puissance.',
    ]);
  });
});

describe('effect transform', () => {
  it('turns the card into its evolved form, which reveals, at the end of turn 3', () => {
    const state = newGame(catalog, { p0: ['barlito', 'v1'] });
    const turn1 = playTurn(catalog, state, {
      p0: [
        ['v1', 0],
        ['barlito', 0],
      ],
    }).state;
    const uid = uidOf(turn1, 0, 'barlito');
    const turn2 = playTurn(catalog, turn1).state;
    expect(turn2.cards[uid]?.defId).toBe('barlito');
    const { state: turn3, events } = playTurn(catalog, turn2);
    const instance = turn3.cards[uid];
    expect(instance?.defId).toBe('bankai');
    expect(instance?.transformedFrom).toBe('barlito');
    expect(instance?.location).toBe(0);
    expect(events).toContainEqual({ type: 'cardTransformed', card: uid, from: 'barlito', to: 'bankai' });
    // The evolved onReveal fired (+1 to the other ally), its innate status came, its endOfTurn waits a turn.
    expect(powerAt(catalog, turn3, 0, 'v1')).toBe(1 + 1);
    expect(instance?.statuses.tough).toBe(1);
    expect(powerAt(catalog, turn3, 0, 'bankai')).toBe(8);
    const turn4 = playTurn(catalog, turn3).state;
    expect(powerAt(catalog, turn4, 0, 'bankai')).toBe(8 + 10);
    expect(checkInvariants(turn4)).toEqual([]);
  });

  it('keeps the uid, the statuses and the power modifier, and stops the old abilities', () => {
    const state = newGame(catalog, { p0: ['larva'] });
    const turn1 = playTurn(catalog, state, { p0: [['larva', 1]] }).state;
    const uid = uidOf(turn1, 0, 'larva');
    expect(turn1.cards[uid]?.powerModifier).toBe(2 + 100);
    const turn3 = skipToTurn(catalog, turn1, 3);
    const after = playTurn(catalog, turn3).state;
    const instance = after.cards[uid];
    expect(instance?.defId).toBe('moth');
    // Two end of turns of +100 before (turns 1 and 2), none from turn 3 the transformation (its later ability never runs).
    expect(instance?.powerModifier).toBe(2 + 200);
    expect(powerAt(catalog, after, 0, 'moth')).toBe(6 + 202);
    // Protection kept, the innate one of the moth not stacked on top.
    expect(instance?.statuses.protected).toBe(1);
    expect(instance?.revealedTurn).toBe(1);
  });

  it('never transforms twice in one resolution (no loop)', () => {
    const state = newGame(catalog, { p0: ['flip'] });
    const uid = uidOf(state, 0, 'flip');
    const { state: turn1, events } = playTurn(catalog, state, { p0: [['flip', 0]] });
    expect(turn1.cards[uid]?.defId).toBe('flop');
    expect(events.filter((event) => event.type === 'cardTransformed')).toHaveLength(1);
    // Next resolution: it is still a flop (onReveal does not fire again).
    expect(playTurn(catalog, turn1).state.cards[uid]?.defId).toBe('flop');
  });

  it('works from a reaction, and a transformation is not a play: no onCardPlayedHere', () => {
    const state = newGame(catalog, { p0: ['cocoon', 'sentinel', 'v1'] });
    const turn1 = playTurn(catalog, state, {
      p0: [
        ['sentinel', 0],
        ['cocoon', 0],
      ],
    }).state;
    expect(powerAt(catalog, turn1, 0, 'sentinel')).toBe(1 + 1);
    const turn2 = playTurn(catalog, turn1, { p0: [['v1', 0]] }).state;
    expect(turn2.cards[uidOf(state, 0, 'cocoon')]?.defId).toBe('moth');
    // Only the v1 counted for the sentinel, not the transformation.
    expect(powerAt(catalog, turn2, 0, 'sentinel')).toBe(1 + 2);
  });

  it('a copy of a transformed card is its printed form: an evolved form never reaches a hand', () => {
    const state = newGame(catalog, { p0: ['phoenix'] });
    const turn1 = playTurn(catalog, state, { p0: [['phoenix', 0]] }).state;
    const hand = turn1.players[0].hand.map((uid) => turn1.cards[uid]?.defId);
    expect(hand).toContain('phoenix');
    expect(hand).not.toContain('phoenix-x');
  });

  it('is public: both players see the event and the new form', () => {
    const state = newGame(catalog, { p0: ['flip'] });
    const { state: turn1, events } = playTurn(catalog, state, { p0: [['flip', 0]] });
    const seen = projectEventsForPlayer(events, 1).filter((event) => event.type === 'cardTransformed');
    expect(seen).toEqual([{ type: 'cardTransformed', card: uidOf(state, 0, 'flip'), from: 'flip', to: 'flop' }]);
    expect(projectForPlayer(catalog, turn1, 1).locations[0]?.cards.opponent[0]?.defId).toBe('flop');
  });

  it('is written in French, naming the evolved form', () => {
    expect(describeCard(catalog, catalog.card('barlito'))).toEqual([
      'En fin de tour : à partir du tour 3, se transforme en « Barlito Bankai ».',
    ]);
    expect(describeCard(catalog, catalog.card('larva'))[1]).toBe(
      'En fin de tour : après 2 tours en jeu, se transforme en « moth ».',
    );
  });
});

describe('transform validation', () => {
  const into = { type: 'transform', into: 'bankai' } as const;
  const base = [evolved('bankai')];

  it('only targets the card itself, never on a terrain, never ongoing, never once destroyed', () => {
    const others = card('bad', {
      abilities: [{ trigger: 'onReveal', target: { type: 'cards', side: 'enemy' }, effect: into }],
    });
    expect(issuesOf([...base, others]).join()).toContain('transforms itself');
    expect(issuesOf([...base, card('bad', { abilities: [{ trigger: 'ongoing', effect: into }] })]).join()).toContain(
      'cannot be ongoing',
    );
    expect(
      issuesOf([...base, card('bad', { abilities: [{ trigger: 'onDestroyed', effect: into }] })]).join(),
    ).toContain('cannot target itself');
    const terrain: LocationInput = { id: 'loc-x', name: 'x', abilities: [{ trigger: 'endOfTurn', effect: into }] };
    expect(issuesOf(base, [terrain]).join()).toContain('never transforms');
  });

  it('checks the evolved form at load', () => {
    const ghost = card('bad', { abilities: [{ trigger: 'onReveal', effect: { type: 'transform', into: 'ghost' } }] });
    expect(issuesOf([ghost]).join()).toContain('unknown card "ghost"');
    const self = card('bad', { abilities: [{ trigger: 'onReveal', effect: { type: 'transform', into: 'bad' } }] });
    expect(issuesOf([self]).join()).toContain('into itself');
    const gift = card('bad', { abilities: [{ trigger: 'onReveal', effect: { type: 'addToHand', card: 'bankai' } }] });
    expect(issuesOf([...base, gift]).join()).toContain('evolved form "bankai"');
  });
});

describe('random bots on transformations', () => {
  const pool = [...catalog.cards.values()]
    .filter((definition) => definition.deckable && !definition.id.startsWith('filler'))
    .map((definition) => definition.id);

  it('finish games and keep the invariants', () => {
    for (let game = 0; game < 30; game++) {
      const rng = new Rng({ s: game + 700 });
      const decks = [0, 1].map(() => deckOf(rng.shuffle([...pool]).slice(0, 8), catalog));
      let state = createGame(catalog, {
        seed: `phase6c-${game}`,
        players: [
          { id: 'alice', deck: decks[0] ?? [] },
          { id: 'bob', deck: decks[1] ?? [] },
        ],
        locations: ['loc-a', 'loc-b', 'loc-c'],
      }).state;
      while (state.status === 'playing') {
        state = playRandomTurn(catalog, state, 0, rng);
        state = playRandomTurn(catalog, state, 1, rng);
        expect(checkInvariants(state)).toEqual([]);
      }
      expect(state.result).not.toBeNull();
    }
  });
});
