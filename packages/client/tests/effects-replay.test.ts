import { type CardView, type PlayerEvent } from '@ytcg-game/engine';
import { describe, expect, it } from 'vitest';
import { cardFx, costView, explodes, sceneCard } from '../src/animation/fx.ts';
import { departingAt, rowWithGhosts, trackPlacements } from '../src/animation/placements.ts';
import { IDLE, advance, durationOf, enqueue, lightBeforeDestruction, stepsFor } from '../src/animation/queue.ts';
import { sceneOf } from '../src/animation/scene.ts';
import { catalog } from '../src/catalog.ts';
import { ADD_FLIGHT_MS, arcLift, flightDelta, flightFrames } from '../src/lib/flight.ts';
import { emptySlotKinds, terrainState } from '../src/lib/terrainRules.ts';
import { buildFixture, DEFAULT_OPTIONS } from '../src/sandbox/fixture.ts';
import { SCENARIO_IDS, SCENARIOS } from '../src/sandbox/scenarios.ts';
import { registerSandboxTerrains } from '../src/sandbox/terrains.ts';
import { viewWith } from './support.ts';

const [defId = ''] = catalog.cards.keys();
const sceneAt = (events: PlayerEvent[], steps: number): ReturnType<typeof sceneOf> => {
  let queue = enqueue(IDLE, stepsFor(events, 0, false));
  for (let i = 0; i < steps; i++) {
    queue = advance(queue);
  }
  return sceneOf(queue);
};
const card = (uid: string, extra: Partial<CardView> = {}): CardView => ({
  uid,
  defId,
  cost: 2,
  power: 3,
  breakdown: { printed: 3, modifier: 0, ongoing: [] },
  statuses: {},
  crisis: null,
  ...extra,
});

describe('animation steps', () => {
  it('lights up a destroyed card before its destruction', () => {
    const events: PlayerEvent[] = [
      { type: 'cardDestroyed', card: 'a' },
      { type: 'abilityTriggered', trigger: 'onDestroyed', card: 'a', location: 0 },
      { type: 'powerChanged', card: 'b', delta: 1 },
    ];
    expect(lightBeforeDestruction(events).map((e) => e.type)).toEqual([
      'abilityTriggered',
      'cardDestroyed',
      'powerChanged',
    ]);
    expect(lightBeforeDestruction(events.slice(1))).toEqual(events.slice(1));
  });

  it('gives each new event a duration, shorter for the opponent hand and longer for a crisis', () => {
    const added = { type: 'cardAddedToHand', player: 1, card: null, defId: null } as const;
    expect(durationOf(added, 0)).toBeLessThan(durationOf({ ...added, player: 0, card: 'x', defId }, 0));
    expect(durationOf({ type: 'crisisStarted', card: 'a', crisis: 'rage' }, 0)).toBe(950);
    expect(durationOf({ type: 'cardMoved', card: 'a', from: 0, to: 1 }, 0)).toBe(700);
    expect(
      durationOf({ type: 'statusChanged', card: 'a', status: 'protected', stacks: 0, spent: true }, 0),
    ).toBeGreaterThan(durationOf({ type: 'statusChanged', card: 'a', status: 'protected', stacks: 1 }, 0));
  });

  it('keeps no animation at all under reduced motion', () => {
    expect(stepsFor([{ type: 'cardMoved', card: 'a', from: 0, to: 1 }], 0, true)).toEqual([]);
  });
});

describe('scene of the new events', () => {
  const events: PlayerEvent[] = [
    { type: 'cardMoved', card: 'a', from: 0, to: 1 },
    { type: 'costChanged', player: 0, card: 'h', delta: -1 },
    { type: 'cardAddedToHand', player: 0, card: 'n', defId },
    { type: 'cardAddedToHand', player: 1, card: null, defId: null },
    { type: 'crisisStarted', card: 'c', crisis: 'wandering' },
    { type: 'statusChanged', card: 'p', status: 'protected', stacks: 0, spent: true },
  ];

  it('holds back what has not happened yet', () => {
    const scene = sceneAt(events, 0);
    expect(scene.current).toEqual(events[0]);
    expect(scene.costPending.get('h')).toBe(-1);
    expect(scene.undrawn.has('n')).toBe(true);
    expect(scene.opponentAdds).toBe(1);
    expect(scene.crisisPending.has('c')).toBe(true);
    expect(scene.shielded.has('p')).toBe(true);
  });

  it('keeps a card at its origin until its move, then lands it', () => {
    const before = sceneAt(
      [
        { type: 'turnStarted', turn: 2 },
        { type: 'cardMoved', card: 'a', from: 0, to: 1 },
      ],
      0,
    );
    expect(before.unmoved.get('a')).toBe(0);
    expect(sceneAt(events, 0).unmoved.has('a')).toBe(false);
  });

  it('releases each hold at its own step', () => {
    const scene = sceneAt(events, 4);
    expect(scene.crisisPending.has('c')).toBe(false);
    expect(scene.opponentAdds).toBe(0);
    expect(scene.undrawn.has('n')).toBe(false);
  });

  it('describes the effect on the card concerned', () => {
    expect(cardFx(sceneAt(events, 0), 'a')).toMatchObject({ effect: 'moved', flight: { kind: 'move' } });
    expect(cardFx(sceneAt(events, 2), 'n')).toMatchObject({ effect: 'added', flight: { kind: 'add', from: null } });
    expect(cardFx(sceneAt(events, 4), 'c').float?.text).toBe('Folie · Errance');
    expect(cardFx(sceneAt(events, 5), 'p')).toMatchObject({ effect: 'shield-break' });
    const spread = sceneAt([{ type: 'contagionSpread', from: 's', to: 't' }], 0);
    expect(cardFx(spread, 's').effect).toBe('trigger');
    expect(cardFx(spread, 't').effect).toBe('infect');
  });
});

describe('card as shown by the replay', () => {
  const events: PlayerEvent[] = [
    { type: 'costChanged', player: 0, card: 'h', delta: -1 },
    { type: 'crisisStarted', card: 'c', crisis: 'rage' },
    { type: 'statusChanged', card: 'p', status: 'protected', stacks: 0, spent: true },
  ];

  it('shows the older cost, then old to new, then the final one', () => {
    const hand = card('h', { cost: 2 });
    expect(costView(sceneAt([{ type: 'turnStarted', turn: 1 }, ...events], 0), hand)).toEqual({ shown: 3, flow: null });
    expect(costView(sceneAt(events, 0), hand)).toEqual({ shown: 2, flow: { from: 3, to: 2, delta: -1 } });
    expect(costView(sceneAt(events, 1), hand).flow).toBeNull();
  });

  it('hides the crisis name and keeps the shield until their step', () => {
    const early = sceneAt([{ type: 'turnStarted', turn: 1 }, ...events], 0);
    expect(sceneCard(early, card('c', { crisis: 'rage' })).crisis).toBeNull();
    expect(sceneCard(early, card('p')).statuses.protected).toBe(1);
    expect(sceneCard(sceneAt(events, 1), card('c', { crisis: 'rage' })).crisis).toBe('rage');
  });

  it('blows up an imploding or fully overheated card', () => {
    expect(explodes(card('a', { crisis: 'implosion' }))).toBe(true);
    expect(explodes(card('a', { statuses: { overheat: 3 } }))).toBe(true);
    expect(explodes(card('a', { statuses: { overheat: 2 } }))).toBe(false);
  });
});

describe('placements of moves and ghosts', () => {
  it('keeps the last statuses and crisis of a card that dies, and its place in the row', () => {
    const view = viewWith({ you: [card('a'), card('b')] });
    const first = trackPlacements(new Map(), view, []);
    const gone = viewWith({ you: [card('b')] });
    const next = trackPlacements(first, gone, [
      { type: 'statusChanged', card: 'a', status: 'overheat', stacks: 3 },
      { type: 'crisisStarted', card: 'a', crisis: 'implosion' },
    ]);
    const ghost = next.get('a');
    expect(ghost && explodes(ghost.card)).toBe(true);
    const row = rowWithGhosts(next, [card('b')], ghost === undefined ? [] : [ghost.card]);
    expect(row.map((r) => [r.card.uid, r.ghost])).toEqual([
      ['a', true],
      ['b', false],
    ]);
  });

  it('finds the cards that have not left a spot yet', () => {
    const view = viewWith({ you: [card('a')] });
    const placements = trackPlacements(new Map(), view, []);
    expect(departingAt(placements, new Map([['a', 1]]), { location: 1, side: 'you' }).map((c) => c.uid)).toEqual(['a']);
    expect(departingAt(placements, new Map([['a', 1]]), { location: 0, side: 'you' })).toEqual([]);
  });
});

describe('flight and terrain rules', () => {
  it('starts on the origin, hops over the board and lands on the card', () => {
    const frames = flightFrames(
      { left: 0, top: 100, width: 100, height: 140 },
      { left: 400, top: 100, width: 100, height: 140 },
    );
    expect(frames).toHaveLength(3);
    expect(frames[0]?.translate).toBe('-400px 0px');
    expect(frames[1]?.translate).toBe(`-200px ${-arcLift(400)}px`);
    expect(frames[2]?.translate).toBe('0px 0px');
    expect(
      flightDelta({ left: 0, top: 0, width: 50, height: 70 }, { left: 0, top: 0, width: 100, height: 140 }).scale,
    ).toBe(0.5);
    expect(ADD_FLIGHT_MS).toBeGreaterThan(0);
  });

  it('writes the rules as pills and bars the slots', () => {
    const state = terrainState({ capacity: 3, openFromTurn: 5, closedFromTurn: 6 }, 4);
    expect(state.pills).toEqual(['3 places', 'Ouvre au tour 5', 'Fermé à partir du tour 6']);
    expect(state.closed).toBe('notOpenYet');
    expect(emptySlotKinds(3, state)).toEqual(['closed', 'closed', 'blocked']);
    expect(terrainState({ closedFromTurn: 4 }, 4)).toMatchObject({ closed: 'closed', pills: ['Fermé'] });
    expect(emptySlotKinds(2, terrainState({}, 1))).toEqual(['open', 'open']);
  });
});

describe('sandbox scenarios', () => {
  registerSandboxTerrains(catalog);
  it.each(SCENARIO_IDS)('%s builds a message that only references known cards', (id) => {
    const game = buildFixture(catalog, { ...DEFAULT_OPTIONS, scenario: id }, 0);
    const known = new Set([
      ...game.view.hand.map((c) => c.uid),
      ...game.view.locations.flatMap((l) => [...l.cards.you, ...l.cards.opponent, ...l.yourPending]).map((c) => c.uid),
      ...buildFixture(catalog, DEFAULT_OPTIONS, 0)
        .view.locations.flatMap((l) => [...l.cards.you, ...l.cards.opponent])
        .map((c) => c.uid),
    ]);
    expect(SCENARIOS[id].label).not.toBe('');
    for (const event of game.events) {
      if ('card' in event && event.card !== null) {
        expect(known.has(event.card)).toBe(true);
      }
    }
    for (const location of game.view.locations) {
      expect(catalog.locations.has(location.defId ?? '')).toBe(true);
    }
  });

  it('plays a scenario as a replay with a final view that already shows the result', () => {
    const game = buildFixture(catalog, { ...DEFAULT_OPTIONS, scenario: 'move' }, 0);
    expect(game.view.locations[2]?.cards.you.map((c) => c.uid)).toContain('y5');
    expect(game.events).toEqual([{ type: 'cardMoved', card: 'y5', from: 1, to: 2 }]);
  });
});
