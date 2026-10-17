import { describe, expect, it } from 'vitest';
import {
  CatalogError,
  Rng,
  checkInvariants,
  createGame,
  type GameState,
  type PlayerIndex,
  type StatusId,
  describeCard,
  locationPowers,
} from '../src/index.ts';
import {
  type CardInput,
  type LocationInput,
  card,
  catalogWith,
  deckOf,
  newGame,
  playTurn,
  powerAt,
  uidOf,
} from './support.ts';
import { playRandomTurn } from '../src/sim/bot.ts';

const CHARMER = 'trait:charmeur';
const enemiesHere = { type: 'cards', side: 'enemy' } as const;

const catalog = catalogWith([
  card('v1'),
  card('v2'),
  card('grower', { abilities: [{ trigger: 'endOfTurn', effect: { type: 'addPower', amount: 1 } }] }),
  card('greeter', { abilities: [{ trigger: 'onReveal', effect: { type: 'addPower', amount: 3 } }] }),
  card('aura', {
    abilities: [{ trigger: 'ongoing', target: { type: 'cards' }, effect: { type: 'addPower', amount: 2 } }],
  }),
  card('sentinel', { abilities: [{ trigger: 'onCardPlayedHere', effect: { type: 'addPower', amount: 1 } }] }),
  // Endormie
  card('lullaby', {
    abilities: [
      { trigger: 'onReveal', target: enemiesHere, effect: { type: 'addStatus', status: 'asleep', stacks: 2 } },
    ],
  }),
  card('sandman', {
    abilities: [
      {
        trigger: 'onReveal',
        target: enemiesHere,
        effect: [{ type: 'addStatus', status: 'asleep' }, { type: 'destroy' }],
      },
    ],
  }),
  card('tank', { statuses: ['tough'], abilities: [{ trigger: 'endOfTurn', effect: { type: 'addPower', amount: 1 } }] }),
  card('dreamer', {
    abilities: [
      { trigger: 'ongoing', condition: { type: 'status', status: 'asleep' }, effect: { type: 'addPower', amount: 3 } },
      { trigger: 'endOfTurn', effect: { type: 'addPower', amount: 1 } },
    ],
  }),
  card('sleepy', { statuses: ['asleep'] }),
  card('avenger', {
    abilities: [{ trigger: 'onDestroyed', target: enemiesHere, effect: { type: 'addPower', amount: -2 } }],
  }),
  card('wake-up', { abilities: [{ trigger: 'onReveal', effect: { type: 'removeStatus', status: 'asleep' } }] }),
  // Charmée
  card('charmer', {
    tags: [CHARMER],
    abilities: [{ trigger: 'onReveal', target: enemiesHere, effect: { type: 'addStatus', status: 'charmed' } }],
  }),
  card('charmer2', {
    tags: [CHARMER],
    abilities: [{ trigger: 'onReveal', target: enemiesHere, effect: { type: 'addStatus', status: 'charmed' } }],
  }),
  card('assassin', {
    abilities: [
      {
        trigger: 'onReveal',
        target: { type: 'cards', side: 'enemy', scope: 'everywhere', tag: CHARMER, pick: 'random' },
        effect: { type: 'destroy' },
      },
    ],
  }),
  card('guardian', {
    statuses: ['protected'],
    abilities: [{ trigger: 'endOfTurn', effect: { type: 'addPower', amount: 1 } }],
  }),
  // Marquée
  card('hunter', {
    abilities: [
      { trigger: 'onReveal', target: enemiesHere, effect: { type: 'addStatus', status: 'marked', stacks: 2 } },
    ],
  }),
  card('killer', {
    abilities: [{ trigger: 'onReveal', target: { type: 'cards', side: 'all' }, effect: { type: 'destroy' } }],
  }),
  card('tough-target', { statuses: ['tough'] }),
  card('outlaw', {
    abilities: [
      { trigger: 'ongoing', condition: { type: 'status', status: 'marked' }, effect: { type: 'addPower', amount: 2 } },
    ],
  }),
  // Enragée
  card('rager', { abilities: [{ trigger: 'onReveal', effect: { type: 'addStatus', status: 'enraged' } }] }),
  card('buffer', {
    abilities: [{ trigger: 'onReveal', target: { type: 'cards' }, effect: { type: 'addPower', amount: 2 } }],
  }),
  card('gifter', {
    abilities: [{ trigger: 'onReveal', target: enemiesHere, effect: { type: 'addPower', amount: 2 } }],
  }),
  card('berserk', {
    statuses: ['enraged'],
    abilities: [{ trigger: 'onReveal', effect: { type: 'addPower', amount: 3 } }],
  }),
  // Copy
  card('mimic', { abilities: [{ trigger: 'onReveal', effect: { type: 'copyReveal' } }] }),
  card('mimic2', { abilities: [{ trigger: 'onReveal', effect: { type: 'copyReveal' } }] }),
]);

export function stacks(state: GameState, player: PlayerIndex, defId: string, status: StatusId): number | undefined {
  return state.cards[uidOf(state, player, defId)]?.statuses[status];
}

describe('statuses: Endormie', () => {
  it('switches the abilities off for one turn per stack, then they come back', () => {
    const state = newGame(catalog, { p0: ['grower', 'greeter'], p1: ['lullaby'] });
    const turn1 = playTurn(catalog, state, {
      p0: [
        ['grower', 0],
        ['greeter', 0],
      ],
    }).state;
    expect(powerAt(catalog, turn1, 0, 'grower')).toBe(2);
    const turn2 = playTurn(catalog, turn1, { p1: [['lullaby', 0]] }).state;
    // Asleep: no end of turn growth; the resolved onReveal and the printed power stay.
    expect(powerAt(catalog, turn2, 0, 'grower')).toBe(2);
    expect(powerAt(catalog, turn2, 0, 'greeter')).toBe(4);
    expect(stacks(turn2, 0, 'grower', 'asleep')).toBe(1);
    const turn3 = playTurn(catalog, turn2).state;
    expect(powerAt(catalog, turn3, 0, 'grower')).toBe(2);
    expect(stacks(turn3, 0, 'grower', 'asleep')).toBeUndefined();
    const turn4 = playTurn(catalog, turn3).state;
    expect(powerAt(catalog, turn4, 0, 'grower')).toBe(3);
  });

  it('stops the ongoing bonuses the card gives, but its printed power counts', () => {
    const state = newGame(catalog, { p0: ['aura', 'v1'], p1: ['lullaby'] });
    const turn1 = playTurn(catalog, state, {
      p0: [
        ['aura', 0],
        ['v1', 0],
      ],
    }).state;
    expect(powerAt(catalog, turn1, 0, 'v1')).toBe(3);
    const turn2 = playTurn(catalog, turn1, { p1: [['lullaby', 0]] }).state;
    expect(powerAt(catalog, turn2, 0, 'v1')).toBe(1);
    expect(locationPowers(catalog, turn2)[0]).toEqual([2, 1]);
  });

  it('does not react to the cards played here', () => {
    const state = newGame(catalog, { p0: ['sentinel', 'v1', 'v2'], p1: ['lullaby'] });
    const turn1 = playTurn(catalog, state, { p0: [['sentinel', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p1: [['lullaby', 0]] }).state;
    const turn3 = playTurn(catalog, turn2, { p0: [['v1', 0]] }).state;
    expect(powerAt(catalog, turn3, 0, 'sentinel')).toBe(1);
    const turn4 = playTurn(catalog, turn3, { p0: [['v2', 0]] }).state;
    expect(powerAt(catalog, turn4, 0, 'sentinel')).toBe(2);
  });

  it('keeps the innate statuses working: Coriace still saves a sleeping card', () => {
    const state = newGame(catalog, { p0: ['tank'], p1: ['sandman'] });
    const turn1 = playTurn(catalog, state, { p0: [['tank', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p1: [['sandman', 0]] }).state;
    expect(turn2.cards[uidOf(turn2, 0, 'tank')]?.zone).toBe('board');
    expect(stacks(turn2, 0, 'tank', 'asleep')).toBeUndefined();
    expect(powerAt(catalog, turn2, 0, 'tank')).toBe(2);
  });

  it('does not fire the destruction abilities of a sleeping card', () => {
    const state = newGame(catalog, { p0: ['avenger'], p1: ['sandman'] });
    const turn1 = playTurn(catalog, state, { p0: [['avenger', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p1: [['sandman', 0]] }).state;
    expect(turn2.cards[uidOf(turn2, 0, 'avenger')]?.zone).toBe('destroyed');
    expect(powerAt(catalog, turn2, 1, 'sandman')).toBe(1);
  });

  it('lets a crisis of Folie act: it is the madness of the card, not an ability', () => {
    const state = playTurn(catalog, newGame(catalog, { p0: ['v1'] }), { p0: [['v1', 0]] }).state;
    const instance = state.cards[uidOf(state, 0, 'v1')];
    if (instance === undefined) {
      throw new Error('no v1');
    }
    instance.statuses = { mad: 1, asleep: 1 };
    instance.crisis = 'rage';
    expect(powerAt(catalog, state, 0, 'v1')).toBe(1 + 2);
  });

  it('is replaced by the effect a card defines for it: no switch-off, no wear-off', () => {
    const state = newGame(catalog, { p0: ['dreamer'], p1: ['lullaby'] });
    const turn1 = playTurn(catalog, state, { p0: [['dreamer', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p1: [['lullaby', 0]] }).state;
    expect(powerAt(catalog, turn2, 0, 'dreamer')).toBe(1 + 2 + 3);
    const turn3 = playTurn(catalog, turn2).state;
    expect(stacks(turn3, 0, 'dreamer', 'asleep')).toBe(2);
    expect(powerAt(catalog, turn3, 0, 'dreamer')).toBe(1 + 3 + 3);
  });

  it('is written in French', () => {
    expect(describeCard(catalog, catalog.card('lullaby'))).toEqual([
      'À la révélation : rend les cartes ennemies ici endormies (×2).',
    ]);
    expect(describeCard(catalog, catalog.card('sleepy'))).toEqual([
      'Sommeil (ses capacités ne fonctionnent plus ; perd 1 cumul à chaque fin de tour).',
    ]);
    expect(describeCard(catalog, catalog.card('wake-up'))).toEqual([
      'À la révélation : retire le Sommeil de cette carte.',
    ]);
  });
});

describe('statuses: Charmée', () => {
  it('switches the abilities off while the charmer is on the board, and ends when it leaves', () => {
    const state = newGame(catalog, { p0: ['grower', 'assassin'], p1: ['charmer'] });
    const turn1 = playTurn(catalog, state, { p0: [['grower', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p1: [['charmer', 0]] }).state;
    const turn3 = playTurn(catalog, turn2).state;
    expect(powerAt(catalog, turn3, 0, 'grower')).toBe(2);
    expect(stacks(turn3, 0, 'grower', 'charmed')).toBe(1);
    const { state: turn4, events } = playTurn(catalog, turn3, { p0: [['assassin', 1]] });
    expect(turn4.cards[uidOf(turn4, 1, 'charmer')]?.zone).toBe('destroyed');
    expect(stacks(turn4, 0, 'grower', 'charmed')).toBeUndefined();
    expect(turn4.cards[uidOf(turn4, 0, 'grower')]?.charmedBy).toEqual([]);
    expect(events).toContainEqual({
      type: 'statusChanged',
      card: uidOf(turn4, 0, 'grower'),
      status: 'charmed',
      stacks: 0,
    });
    expect(powerAt(catalog, turn4, 0, 'grower')).toBe(3);
  });

  it('holds as long as one of its charmers is on the board', () => {
    const state = newGame(catalog, { p0: ['grower', 'assassin'], p1: ['charmer', 'charmer2'] });
    const turn1 = playTurn(catalog, state, { p0: [['grower', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, {
      p1: [
        ['charmer', 0],
        ['charmer2', 0],
      ],
    }).state;
    expect(stacks(turn2, 0, 'grower', 'charmed')).toBe(2);
    const turn3 = playTurn(catalog, turn2, { p0: [['assassin', 1]] }).state;
    expect(stacks(turn3, 0, 'grower', 'charmed')).toBe(2);
    expect(turn3.cards[uidOf(turn3, 0, 'grower')]?.charmedBy).toHaveLength(1);
    expect(powerAt(catalog, turn3, 0, 'grower')).toBe(2);
  });

  it('is absorbed by a Protection, like any enemy status', () => {
    const state = newGame(catalog, { p0: ['guardian'], p1: ['charmer'] });
    const turn1 = playTurn(catalog, state, { p0: [['guardian', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p1: [['charmer', 0]] }).state;
    expect(stacks(turn2, 0, 'guardian', 'charmed')).toBeUndefined();
    expect(stacks(turn2, 0, 'guardian', 'protected')).toBeUndefined();
    expect(turn2.cards[uidOf(turn2, 0, 'guardian')]?.charmedBy).toEqual([]);
    expect(powerAt(catalog, turn2, 0, 'guardian')).toBe(3);
  });

  it('is written in French', () => {
    expect(describeCard(catalog, catalog.card('charmer'))).toEqual([
      'À la révélation : rend les cartes ennemies ici charmées.',
    ]);
  });
});

// Puts the hand back in the deck so that draws are not stopped by a full hand.
function emptyHand(state: GameState, player: PlayerIndex): void {
  const playerState = state.players[player];
  for (const uid of playerState.hand) {
    const instance = state.cards[uid];
    if (instance !== undefined) {
      instance.zone = 'deck';
    }
  }
  playerState.deck.push(...playerState.hand);
  playerState.hand = [];
}

describe('statuses: Marquée', () => {
  it('makes the opponent of its owner draw one card per stack when it is destroyed, whoever destroys it', () => {
    const state = newGame(catalog, { p0: ['v1', 'killer'], p1: ['hunter'] });
    const turn1 = playTurn(catalog, state, { p0: [['v1', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p1: [['hunter', 0]] }).state;
    expect(stacks(turn2, 0, 'v1', 'marked')).toBe(2);
    emptyHand(turn2, 1);
    // p0 destroys its own marked card (and the hunter): p1 cashes the bounty.
    const { events } = playTurn(catalog, turn2, { p0: [['killer', 0]] });
    const drawn = events.filter((event) => event.type === 'cardDrawn');
    // Turn start draws one card each, the bounty two more for p1.
    expect(drawn.filter((event) => event.player === 1)).toHaveLength(1 + 2);
    expect(drawn.filter((event) => event.player === 0)).toHaveLength(1);
  });

  it('pays nothing while the card survives (Coriace)', () => {
    const state = newGame(catalog, { p0: ['tough-target', 'killer'], p1: ['hunter'] });
    const turn1 = playTurn(catalog, state, { p0: [['tough-target', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p1: [['hunter', 0]] }).state;
    emptyHand(turn2, 1);
    const { events } = playTurn(catalog, turn2, { p0: [['killer', 0]] });
    expect(events.filter((event) => event.type === 'cardDrawn' && event.player === 1)).toHaveLength(1);
  });

  it('pays no bounty for a card that defines its own effect for it', () => {
    const state = newGame(catalog, { p0: ['outlaw', 'killer'], p1: ['hunter'] });
    const turn1 = playTurn(catalog, state, { p0: [['outlaw', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p1: [['hunter', 0]] }).state;
    expect(powerAt(catalog, turn2, 0, 'outlaw')).toBe(3);
    emptyHand(turn2, 1);
    const { events } = playTurn(catalog, turn2, { p0: [['killer', 0]] });
    expect(events.filter((event) => event.type === 'cardDrawn' && event.player === 1)).toHaveLength(1);
  });

  it('is written in French', () => {
    expect(describeCard(catalog, catalog.card('hunter'))).toEqual([
      'À la révélation : rend les cartes ennemies ici marquées (×2).',
    ]);
    expect(describeCard(catalog, catalog.card('outlaw'))).toEqual(['Marquée : +2 puissance.']);
  });
});

describe('statuses: Enragée', () => {
  it('gains 1 power per stack at every end of turn', () => {
    const state = newGame(catalog, { p0: ['rager'] });
    const turn1 = playTurn(catalog, state, { p0: [['rager', 0]] }).state;
    expect(powerAt(catalog, turn1, 0, 'rager')).toBe(2);
    expect(powerAt(catalog, playTurn(catalog, turn1).state, 0, 'rager')).toBe(3);
  });

  it('refuses the power bonuses of its allies, one-shot or ongoing, but not the enemy ones', () => {
    const state = newGame(catalog, { p0: ['rager', 'aura', 'buffer'], p1: ['gifter'] });
    const turn1 = playTurn(catalog, state, {
      p0: [
        ['rager', 0],
        ['aura', 0],
        ['buffer', 0],
      ],
    }).state;
    expect(powerAt(catalog, turn1, 0, 'rager')).toBe(1 + 1);
    expect(powerAt(catalog, turn1, 0, 'aura')).toBe(1 + 2);
    expect(powerAt(catalog, turn1, 0, 'buffer')).toBe(1 + 2);
    const turn2 = playTurn(catalog, turn1, { p1: [['gifter', 0]] }).state;
    expect(powerAt(catalog, turn2, 0, 'rager')).toBe(2 + 2 + 1);
  });

  it('keeps the bonuses of its own abilities', () => {
    const state = newGame(catalog, { p0: ['berserk'] });
    const turn1 = playTurn(catalog, state, { p0: [['berserk', 0]] }).state;
    expect(powerAt(catalog, turn1, 0, 'berserk')).toBe(1 + 3 + 1);
  });

  it('is written in French', () => {
    expect(describeCard(catalog, catalog.card('rager'))).toEqual(['À la révélation : devient enragée.']);
    expect(describeCard(catalog, catalog.card('berserk'))[0]).toBe(
      'Fureur (gagne 1 puissance par cumul à chaque fin de tour ; ignore les bonus de puissance des autres cartes alliées).',
    );
  });
});

function issuesOf(cards: CardInput[], locations: LocationInput[] = []): readonly string[] {
  try {
    catalogWith(cards, locations);
  } catch (error) {
    expect(error).toBeInstanceOf(CatalogError);
    return (error as CatalogError).issues;
  }
  throw new Error('expected a CatalogError');
}

describe('copyReveal', () => {
  it('runs the onReveal abilities of the last allied card played here, for the copier', () => {
    const state = newGame(catalog, { p0: ['greeter', 'mimic'] });
    const turn1 = playTurn(catalog, state, { p0: [['greeter', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p0: [['mimic', 0]] }).state;
    expect(powerAt(catalog, turn2, 0, 'mimic')).toBe(1 + 3);
    expect(powerAt(catalog, turn2, 0, 'greeter')).toBe(1 + 3);
  });

  it('resolves targets from the copier: « the other allies here » are the copier’s', () => {
    const state = newGame(catalog, { p0: ['v1', 'buffer', 'mimic'] });
    const turn1 = playTurn(catalog, state, {
      p0: [
        ['v1', 0],
        ['buffer', 0],
        ['mimic', 0],
      ],
    }).state;
    expect(powerAt(catalog, turn1, 0, 'v1')).toBe(1 + 2 + 2);
    expect(powerAt(catalog, turn1, 0, 'buffer')).toBe(1 + 2);
    // The buffer revealed before the mimic: nothing buffs the mimic.
    expect(powerAt(catalog, turn1, 0, 'mimic')).toBe(1);
  });

  it('copies nothing without an allied card played here before it', () => {
    const state = newGame(catalog, { p0: ['greeter', 'mimic'], p1: ['greeter'] });
    const turn1 = playTurn(catalog, state, { p0: [['greeter', 1]], p1: [['greeter', 0]] }).state;
    const turn2 = playTurn(catalog, turn1, { p0: [['mimic', 0]] }).state;
    expect(powerAt(catalog, turn2, 0, 'mimic')).toBe(1);
  });

  it('does nothing when the last card is itself a copier (no loop)', () => {
    const state = newGame(catalog, { p0: ['greeter', 'mimic', 'mimic2'] });
    const turn1 = playTurn(catalog, state, {
      p0: [
        ['greeter', 0],
        ['mimic', 0],
        ['mimic2', 0],
      ],
    }).state;
    expect(powerAt(catalog, turn1, 0, 'mimic')).toBe(1 + 3);
    expect(powerAt(catalog, turn1, 0, 'mimic2')).toBe(1);
  });

  it('is refused on a terrain and on an ongoing ability', () => {
    expect(
      issuesOf(
        [],
        [{ id: 'loc-copy', name: 'x', abilities: [{ trigger: 'onReveal', effect: { type: 'copyReveal' } }] }],
      ).join(),
    ).toContain('copyReveal');
    expect(
      issuesOf([card('bad', { abilities: [{ trigger: 'ongoing', effect: { type: 'copyReveal' } }] })]).join(),
    ).toContain('copyReveal');
  });

  it('is written in French', () => {
    expect(describeCard(catalog, catalog.card('mimic'))).toEqual([
      "À la révélation : copie l'effet de révélation de la dernière carte alliée jouée ici.",
    ]);
  });
});

describe('random bots on the phase 6b building blocks', () => {
  const pool = [...catalog.cards.keys()].filter((id) => !id.startsWith('filler'));

  it('finish games and keep the invariants', () => {
    for (let game = 0; game < 30; game++) {
      const rng = new Rng({ s: game + 600 });
      const decks = [0, 1].map(() => deckOf(rng.shuffle([...pool]).slice(0, 8), catalog));
      let state = createGame(catalog, {
        seed: `phase6b-${game}`,
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
