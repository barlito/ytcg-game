import type { PlayerEvent } from '@ytcg-game/engine';
import { describe, expect, it } from 'vitest';
import { ghostsAt, printedCard, trackPlacements } from '../src/animation/placements.ts';
import { IDLE, advance, currentStep, enqueue, stepsFor } from '../src/animation/queue.ts';
import { STILL, cardFx, sceneOf } from '../src/animation/scene.ts';
import { catalog } from '../src/catalog.ts';
import { viewWith } from './support.ts';

const [defId = ''] = catalog.cards.keys();

const resolution: PlayerEvent[] = [
  { type: 'revealPriority', player: 1 },
  { type: 'cardRevealed', card: 'p1c1', defId, player: 1, location: 0 },
  { type: 'cardRevealed', card: 'p0c1', defId, player: 0, location: 0 },
  { type: 'powerChanged', card: 'p0c1', delta: 2 },
  { type: 'cardDestroyed', card: 'p1c1' },
  { type: 'turnStarted', turn: 3 },
  { type: 'cardDrawn', player: 0, card: 'p0c9' },
  { type: 'cardDrawn', player: 1, card: null },
];

function playUntil(type: PlayerEvent['type'], nth = 1): ReturnType<typeof sceneOf> {
  let queue = enqueue(IDLE, stepsFor(resolution, 0, false));
  let seen = 0;
  while (currentStep(queue) !== null) {
    if (currentStep(queue)?.event.type === type && ++seen === nth) {
      return sceneOf(queue);
    }
    queue = advance(queue);
  }
  throw new Error(`no ${type} step`);
}

describe('event queue', () => {
  it('plays every event in order, opponent draws faster, then goes idle', () => {
    const steps = stepsFor(resolution, 0, false);
    expect(steps.map((step) => step.event)).toEqual(resolution);
    expect(steps[6]?.duration).toBeGreaterThan(steps[7]?.duration ?? Infinity);
    let queue = enqueue(IDLE, steps);
    for (const event of resolution) {
      expect(currentStep(queue)?.event).toEqual(event);
      queue = advance(queue);
    }
    expect(queue).toEqual(IDLE);
  });

  it('appends a new message after the remaining steps, dropping the played ones', () => {
    const first = advance(enqueue(IDLE, stepsFor(resolution.slice(0, 2), 0, false)));
    const next = enqueue(first, stepsFor([{ type: 'turnStarted', turn: 4 }], 0, false));
    expect(next.steps.map((step) => step.event.type)).toEqual(['cardRevealed', 'turnStarted']);
    expect(next.index).toBe(0);
  });

  it('replays nothing under reduced motion', () => {
    expect(stepsFor(resolution, 0, true)).toEqual([]);
    expect(sceneOf(IDLE)).toBe(STILL);
  });
});

describe('scene', () => {
  it('keeps cards face down until their reveal, then flips them', () => {
    const priority = playUntil('revealPriority');
    expect(cardFx(priority, 'p1c1').faceDown).toBe(true);
    expect(cardFx(priority, 'p0c1').faceDown).toBe(true);
    const reveal = playUntil('cardRevealed', 2);
    expect(cardFx(reveal, 'p1c1').faceDown).toBe(false);
    expect(cardFx(reveal, 'p0c1')).toEqual({ faceDown: false, effect: 'reveal', float: null });
  });

  it('floats power changes and keeps a destroyed card as a ghost until its destruction played', () => {
    const power = playUntil('powerChanged');
    expect(cardFx(power, 'p0c1')).toMatchObject({ effect: 'power-up', float: { text: '+2', tone: 'up' } });
    expect(power.dying.has('p1c1')).toBe(true);
    expect(cardFx(playUntil('cardDestroyed'), 'p1c1').effect).toBe('destroy');
    expect(playUntil('turnStarted').dying.has('p1c1')).toBe(false);
  });

  it('hides own draws still to come and holds the result until the game end played', () => {
    expect(playUntil('turnStarted').undrawn.has('p0c9')).toBe(true);
    expect(cardFx(playUntil('cardDrawn'), 'p0c9').effect).toBe('draw');
    const ending = sceneOf(enqueue(IDLE, stepsFor([{ type: 'turnStarted', turn: 6 }, endEvent()], 0, false)));
    expect(ending.outcomeHeld).toBe(true);
  });

  it('names status changes', () => {
    const scene = sceneOf(
      enqueue(IDLE, stepsFor([{ type: 'statusChanged', card: 'a', status: 'high', stacks: 2 }], 0, false)),
    );
    expect(cardFx(scene, 'a').float).toEqual({ text: 'Défonce ×2', tone: 'status-high' });
    const removed = sceneOf(
      enqueue(IDLE, stepsFor([{ type: 'statusChanged', card: 'a', status: 'mad', stacks: 0 }], 0, false)),
    );
    expect(cardFx(removed, 'a').float?.text).toBe('− Folie');
  });
});

function endEvent(): PlayerEvent {
  return {
    type: 'gameEnded',
    result: { winner: 0, locationWinners: [0, 0, 1], locationPowers: [], totalPower: [3, 1] },
  };
}

describe('placements', () => {
  it('remembers where a destroyed card stood, from the reveal event or an earlier view', () => {
    const view = viewWith({ opponent: [], you: [] });
    const placements = trackPlacements(new Map(), view, resolution);
    expect(placements.get('p1c1')).toEqual({ location: 0, side: 'opponent', card: printedCard('p1c1', defId) });
    const dying = new Set(['p1c1']);
    expect(ghostsAt(placements, dying, { location: 0, side: 'opponent', present: [] })).toHaveLength(1);
    expect(ghostsAt(placements, dying, { location: 1, side: 'opponent', present: [] })).toEqual([]);
    expect(ghostsAt(placements, dying, { location: 0, side: 'you', present: [] })).toEqual([]);
  });

  it('never doubles a card still in the view', () => {
    const card = printedCard('p0c1', defId);
    const view = viewWith({ you: [card] });
    const placements = trackPlacements(new Map(), view, []);
    expect(ghostsAt(placements, new Set(['p0c1']), { location: 0, side: 'you', present: [card] })).toEqual([]);
  });
});
