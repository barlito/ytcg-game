import { describe, expect, it } from 'vitest';
import {
  CRISES,
  type CrisisId,
  type GameState,
  type PlayerIndex,
  describeCard,
  projectEventsForPlayer,
  projectForPlayer,
} from '../src/index.ts';
import { loadDataDir } from '../src/sim/data.ts';
import { card, catalogWith, newGame, playTurn, powerAt, skipToTurn, uidOf } from './support.ts';

const MAD_ALL = { type: 'addStatus', status: 'mad' } as const;

const catalog = catalogWith([
  card('v1'),
  card('v2'),
  // Revealed mad: draws its crisis.
  card('lunatic', { power: 3, statuses: ['mad'] }),
  // Made mad by hand (state is plain JSON) so that its crisis is the one the test wants.
  card('patient', { power: 3 }),
  card('patient2', { power: 3 }),
  card('tough-patient', { power: 3, statuses: ['tough'] }),
  card('shield-patient', { power: 3, statuses: ['protected'] }),
  // Madness defined by the card: no crisis is drawn.
  card('benj', {
    power: 2,
    statuses: ['mad'],
    abilities: [{ trigger: 'ongoing', condition: { type: 'mad' }, effect: { type: 'addPower', amount: 2 } }],
  }),
  card('plain-benj', {
    power: 2,
    abilities: [{ trigger: 'ongoing', condition: { type: 'mad' }, effect: { type: 'addPower', amount: 2 } }],
  }),
  card('twitchy', {
    power: 2,
    statuses: ['mad'],
    abilities: [{ trigger: 'onMad', effect: { type: 'addPower', amount: 3 } }],
  }),
  card('prone', {
    power: 2,
    abilities: [{ trigger: 'endOfTurn', condition: { type: 'mad' }, effect: { type: 'addPower', amount: 1 } }],
  }),
  card('sober', {
    abilities: [{ trigger: 'onReveal', target: { type: 'cards', side: 'all' }, effect: { type: 'removeStatus' } }],
  }),
  card('maddener', { abilities: [{ trigger: 'onReveal', target: { type: 'cards', side: 'all' }, effect: MAD_ALL }] }),
  card('maddener2', { abilities: [{ trigger: 'onReveal', target: { type: 'cards', side: 'all' }, effect: MAD_ALL }] }),
]);

// Plays the first turn, then makes the listed cards mad with the given crisis (and no draw).
function withCrisis(
  plays: [string, number][],
  crises: Record<string, CrisisId>,
  p1: [string, number][] = [],
): GameState {
  const state = newGame(catalog, {
    p0: plays.map(([id]) => id),
    p1: [...p1.map(([id]) => id), 'maddener', 'sober', 'maddener2'],
    seed: 'madness',
  });
  const next = playTurn(catalog, state, { p0: plays, p1 }).state;
  for (const [defId, crisis] of Object.entries(crises)) {
    const instance = next.cards[uidOf(next, 0, defId)];
    if (instance === undefined) {
      throw new Error('missing card');
    }
    instance.statuses.mad = 1;
    instance.crisis = crisis;
  }
  return next;
}

const crisisOf = (state: GameState, defId: string, player: PlayerIndex = 0): CrisisId | null | undefined =>
  state.cards[uidOf(state, player, defId)]?.crisis;

describe('default madness: the crisis draw', () => {
  const draw = (seed: string): GameState =>
    playTurn(catalog, newGame(catalog, { p0: ['lunatic'], seed }), { p0: [['lunatic', 0]] }).state;

  it('draws one crisis, deterministic for a seed, and shows it to both players', () => {
    const state = draw('s1');
    const crisis = crisisOf(state, 'lunatic');
    expect(crisis).not.toBeNull();
    expect(crisisOf(draw('s1'), 'lunatic')).toBe(crisis);
    const crises = new Set(Array.from({ length: 30 }, (_, i) => crisisOf(draw(`seed-${i}`), 'lunatic')));
    expect(crises.size).toBeGreaterThan(2);
    for (const viewer of [0, 1] as const) {
      const views = projectForPlayer(catalog, state, viewer).locations.flatMap((location) => [
        ...location.cards.you,
        ...location.cards.opponent,
      ]);
      expect(views.find((view) => view.defId === 'lunatic')?.crisis).toBe(crisis);
    }
  });

  it('announces the crisis in the events of both players', () => {
    const { events } = playTurn(catalog, newGame(catalog, { p0: ['lunatic'] }), { p0: [['lunatic', 0]] });
    for (const viewer of [0, 1] as const) {
      expect(projectEventsForPlayer(events, viewer).filter((event) => event.type === 'crisisStarted')).toHaveLength(1);
    }
  });

  it('draws once: stacking the Folie keeps the crisis, losing it forgets it, going mad again redraws', () => {
    const state = withCrisis([['patient', 0]], { patient: 'rage' });
    const stacked = playTurn(catalog, state, { p1: [['maddener', 0]] }).state;
    expect(stacked.cards[uidOf(stacked, 0, 'patient')]?.statuses.mad).toBe(2);
    expect(crisisOf(stacked, 'patient')).toBe('rage');

    const calm = playTurn(catalog, stacked, { p1: [['sober', 0]] }).state;
    expect(calm.cards[uidOf(calm, 0, 'patient')]?.statuses.mad).toBeUndefined();
    expect(crisisOf(calm, 'patient')).toBeNull();
    expect(powerAt(catalog, calm, 0, 'patient')).toBe(3);

    const again = playTurn(catalog, calm, { p1: [['maddener2', 0]] }).state;
    expect(crisisOf(again, 'patient')).not.toBeNull();
  });
});

describe('card-defined madness', () => {
  it('applies "mad" conditions only while mad and draws no crisis', () => {
    const state = newGame(catalog, { p0: ['benj', 'plain-benj'], p1: ['maddener'] });
    const next = playTurn(catalog, state, {
      p0: [
        ['benj', 0],
        ['plain-benj', 0],
      ],
    }).state;
    expect(crisisOf(next, 'benj')).toBeNull();
    expect(powerAt(catalog, next, 0, 'benj')).toBe(4);
    expect(powerAt(catalog, next, 0, 'plain-benj')).toBe(2);
    const mad = playTurn(catalog, next, { p1: [['maddener', 0]] }).state;
    expect(powerAt(catalog, mad, 0, 'plain-benj')).toBe(4);
    expect(crisisOf(mad, 'plain-benj')).toBeNull();
  });

  it('fires onMad when the card becomes mad, without a crisis', () => {
    const next = playTurn(catalog, newGame(catalog, { p0: ['twitchy'] }), { p0: [['twitchy', 0]] }).state;
    expect(powerAt(catalog, next, 0, 'twitchy')).toBe(5);
    expect(crisisOf(next, 'twitchy')).toBeNull();
  });

  it('runs end-of-turn "mad" abilities only for a mad card', () => {
    const state = newGame(catalog, { p0: ['prone'], p1: ['maddener'] });
    const sane = playTurn(catalog, state, { p0: [['prone', 0]] }).state;
    expect(powerAt(catalog, sane, 0, 'prone')).toBe(2);
    const mad = playTurn(catalog, sane, { p1: [['maddener', 0]] }).state;
    expect(powerAt(catalog, mad, 0, 'prone')).toBe(3);
  });

  it('describes the madness abilities in French', () => {
    const lines = (id: string): string[] => describeCard(catalog, catalog.card(id));
    expect(lines('plain-benj')).toEqual(['Folle : +2 puissance.']);
    expect(lines('twitchy')).toEqual(['Folie.', 'Quand elle devient folle : +3 puissance.']);
    expect(lines('prone')).toEqual(['En fin de tour, si elle est folle : +1 puissance.']);
  });
});

describe('crises', () => {
  it('has a French name and rule for each crisis of the pool', () => {
    for (const rule of Object.values(CRISES)) {
      expect(rule.name).not.toBe('');
      expect(rule.description).toMatch(/^En (continu|fin de tour) : /);
    }
  });

  it('Rage gives +2 power, Délire takes 2', () => {
    const rage = withCrisis([['patient', 0]], { patient: 'rage' });
    expect(powerAt(catalog, rage, 0, 'patient')).toBe(5);
    const delirium = withCrisis([['patient', 0]], { patient: 'delirium' });
    expect(powerAt(catalog, delirium, 0, 'patient')).toBe(1);
  });

  it('Délire does not weaken a Coriace card nor spend a Protection', () => {
    const tough = withCrisis([['tough-patient', 0]], { 'tough-patient': 'delirium' });
    expect(powerAt(catalog, tough, 0, 'tough-patient')).toBe(3);
    const shield = withCrisis([['shield-patient', 0]], { 'shield-patient': 'delirium' });
    expect(powerAt(catalog, shield, 0, 'shield-patient')).toBe(1);
    expect(shield.cards[uidOf(shield, 0, 'shield-patient')]?.statuses.protected).toBe(1);
  });

  it('Errance moves the card to another location at the end of the turn', () => {
    const state = withCrisis([['patient', 0]], { patient: 'wandering' });
    const next = playTurn(catalog, state).state;
    expect(next.cards[uidOf(next, 0, 'patient')]?.location).not.toBe(0);
  });

  it('Contagion makes a sane card here mad (both sides), and leaves loners alone', () => {
    const state = withCrisis([['patient', 0]], { patient: 'contagion' }, [['v1', 0]]);
    const { state: next, events } = playTurn(catalog, state);
    expect(next.cards[uidOf(next, 1, 'v1')]?.statuses.mad).toBe(1);
    expect(crisisOf(next, 'v1', 1)).not.toBeNull();
    expect(events).toContainEqual({
      type: 'contagionSpread',
      from: uidOf(next, 0, 'patient'),
      to: uidOf(next, 1, 'v1'),
    });
    const alone = playTurn(catalog, withCrisis([['patient', 0]], { patient: 'contagion' })).state;
    expect(alone.cards[uidOf(alone, 0, 'patient')]?.statuses).toEqual({ mad: 1 });
  });

  it('Contagion never targets a card elsewhere nor an already mad one', () => {
    const state = withCrisis(
      [
        ['patient', 0],
        ['patient2', 0],
      ],
      { patient: 'contagion', patient2: 'rage' },
      [['v1', 1]],
    );
    const next = playTurn(catalog, state).state;
    expect(next.cards[uidOf(next, 1, 'v1')]?.statuses.mad).toBeUndefined();
    expect(next.cards[uidOf(next, 0, 'patient2')]?.statuses.mad).toBe(1);
  });

  it('Implosion destroys the card and gives +2 to the other mad cards here', () => {
    const state = withCrisis(
      [
        ['patient', 0],
        ['patient2', 0],
      ],
      { patient: 'implosion', patient2: 'rage' },
      [['v1', 0]],
    );
    const next = playTurn(catalog, state).state;
    expect(next.cards[uidOf(next, 0, 'patient')]?.zone).toBe('destroyed');
    expect(next.cards[uidOf(next, 0, 'patient2')]?.powerModifier).toBe(2);
    expect(next.cards[uidOf(next, 1, 'v1')]?.powerModifier).toBe(0);
  });

  it('Implosion: a Protection absorbs the destruction and no bonus is given', () => {
    const state = withCrisis(
      [
        ['shield-patient', 0],
        ['patient2', 0],
      ],
      { 'shield-patient': 'implosion', patient2: 'rage' },
    );
    const next = playTurn(catalog, state).state;
    const survivor = next.cards[uidOf(next, 0, 'shield-patient')];
    expect(survivor?.zone).toBe('board');
    expect(survivor?.statuses.protected).toBeUndefined();
    expect(next.cards[uidOf(next, 0, 'patient2')]?.powerModifier).toBe(0);
  });

  it('Implosion does not destroy nor reward when the card is Coriace (which can still go mad)', () => {
    const state = withCrisis(
      [
        ['tough-patient', 0],
        ['patient2', 0],
      ],
      { 'tough-patient': 'implosion', patient2: 'rage' },
    );
    const next = skipToTurn(catalog, state, 4);
    expect(next.cards[uidOf(next, 0, 'tough-patient')]?.zone).toBe('board');
    expect(next.cards[uidOf(next, 0, 'tough-patient')]?.statuses.mad).toBe(1);
    expect(next.cards[uidOf(next, 0, 'patient2')]?.powerModifier).toBe(0);
  });
});

describe('Benj (data)', () => {
  it('every Benj has a "Folle : +N puissance" ability (1 up to cost 3, 2 above) and no random crisis', () => {
    const benjs = [...loadDataDir().cards.values()].filter((definition) => definition.tags.includes('character:benj'));
    expect(benjs.length).toBeGreaterThan(10);
    for (const definition of benjs) {
      const amount = definition.cost <= 3 ? 1 : 2;
      const own = definition.abilities.filter((ability) => ability.params.condition?.type === 'mad');
      expect(own.map((ability) => ability.params.effect)).toEqual([[{ type: 'addPower', amount }]]);
      expect(describeCard(loadDataDir(), definition)).toContain(`Folle : +${amount} puissance.`);
    }
  });
});
