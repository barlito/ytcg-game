import { describe, expect, it } from 'vitest';
import { catalog } from '../src/catalog.ts';
import { toLocalClock, turnClock } from '../src/clock.ts';
import { bannerText } from '../src/components/ReplayBanner.tsx';
import { placeTooltip } from '../src/components/Tooltip.tsx';
import { canDrop, dropActions, parseDropId } from '../src/dnd.ts';
import { CALM, windBetween } from '../src/lib/dragWind.ts';
import { printedCard } from '../src/animation/placements.ts';
import { powerLines, powerTrend, statusLines } from '../src/power.ts';
import { viewWith } from './support.ts';

const [defId = '', otherId = ''] = catalog.cards.keys();
const [locationId = ''] = catalog.locations.keys();
const seats = [
  { name: 'Alice', connected: true },
  { name: 'Bob', connected: true },
];

describe('drag and drop', () => {
  const pending = printedCard('p0c2', defId);
  const view = viewWith({ pending: [pending] }, { playableCards: ['p0c1'], openLocations: [0, 1] });

  it('lets a playable hand card drop on open locations only', () => {
    const card = { uid: 'p0c1', origin: 'hand' } as const;
    expect(canDrop(view, card, { kind: 'location', index: 1 })).toBe(true);
    expect(canDrop(view, card, { kind: 'location', index: 2 })).toBe(false);
    expect(canDrop(view, { uid: 'p0c5', origin: 'hand' }, { kind: 'location', index: 0 })).toBe(false);
    expect(canDrop(view, card, { kind: 'hand' })).toBe(false);
    expect(dropActions(view, card, { kind: 'location', index: 1 })).toEqual([
      { type: 'play', card: 'p0c1', location: 1 },
    ]);
    expect(dropActions(view, card, null)).toEqual([]);
  });

  it('takes a face-down card back to the hand, or moves it elsewhere', () => {
    const card = { uid: 'p0c2', origin: 'pending' } as const;
    expect(dropActions(view, card, { kind: 'hand' })).toEqual([{ type: 'cancel', card: 'p0c2' }]);
    expect(dropActions(view, card, { kind: 'location', index: 1 })).toEqual([
      { type: 'cancel', card: 'p0c2' },
      { type: 'play', card: 'p0c2', location: 1 },
    ]);
    expect(dropActions(view, card, { kind: 'location', index: 0 })).toEqual([]);
    expect(dropActions({ ...view, ready: true }, card, { kind: 'hand' })).toEqual([]);
  });

  it('reads drop zone ids', () => {
    expect(parseDropId('hand')).toEqual({ kind: 'hand' });
    expect(parseDropId('location:2')).toEqual({ kind: 'location', index: 2 });
    expect(parseDropId('location:x')).toBeNull();
    expect(parseDropId(undefined)).toBeNull();
  });

  it('leans the dragged card against its velocity, within bounds', () => {
    const wind = windBetween({ x: 0, y: 0, t: 0 }, { x: 200, y: 0, t: 16 });
    expect(wind.ry).toBeLessThan(0);
    expect(wind.ry).toBeGreaterThanOrEqual(-14);
    expect(wind.strength).toBe(1);
    expect(windBetween({ x: 5, y: 5, t: 0 }, { x: 5, y: 5, t: 16 })).toEqual({ ...CALM, rx: 0, ry: -0 });
  });
});

describe('power breakdown', () => {
  it('shows buffs and debuffs against the printed power', () => {
    const base = printedCard('a', defId);
    const printed = base.breakdown.printed;
    const buffed = {
      ...base,
      power: printed + 1,
      breakdown: {
        printed,
        modifier: 2,
        ongoing: [
          { from: 'location' as const, defId: locationId, amount: 1 },
          { from: 'card' as const, defId: otherId, amount: -2 },
        ],
      },
    };
    expect(powerTrend(base)).toBe('even');
    expect(powerTrend(buffed)).toBe('up');
    expect(powerTrend({ ...buffed, power: printed - 1 })).toBe('down');
    expect(powerLines(buffed)).toEqual([
      { label: 'Base', amount: printed },
      { label: 'Effets subis', amount: 2 },
      { label: `Continu · ${catalog.location(locationId).name}`, amount: 1 },
      { label: `Continu · ${catalog.card(otherId).name}`, amount: -2 },
    ]);
  });

  it('lists statuses with their stacks and rule', () => {
    const card = { ...printedCard('a', defId), statuses: { high: 2, mad: 1 } };
    expect(statusLines(card)).toEqual([
      { id: 'mad', name: 'Folie', stacks: 1, rule: 'Sans effet propre : d’autres cartes la lisent.' },
      { id: 'high', name: 'Défonce', stacks: 2, rule: 'Perd 1 puissance par cumul à chaque fin de tour.' },
    ]);
  });
});

describe('turn clock', () => {
  it('counts the reading pause down first, then the turn', () => {
    expect(turnClock(1000, 66_000, 6000)).toEqual({ phase: 'reading', seconds: 5 });
    expect(turnClock(6000, 66_000, 6000)).toEqual({ phase: 'turn', seconds: 60 });
    expect(turnClock(70_000, 66_000, null)).toEqual({ phase: 'turn', seconds: 0 });
    expect(turnClock(0, null, null)).toBeNull();
  });
});

describe('replay banners', () => {
  it('announces turns, reveal order and redraws, nothing for card events', () => {
    expect(bannerText({ type: 'turnStarted', turn: 3 }, 0, seats)).toBe('Tour 3');
    expect(bannerText({ type: 'revealPriority', player: 1 }, 0, seats)).toBe('Bob révèle en premier');
    expect(bannerText({ type: 'revealPriority', player: 0 }, 0, seats)).toBe('Tu révèles en premier');
    expect(bannerText({ type: 'handRedrawn', player: 1 }, 0, seats)).toBe('Bob repioche sa main');
    expect(bannerText({ type: 'cardDestroyed', card: 'x' }, 0, seats)).toBeNull();
  });
});

describe('tooltip placement', () => {
  const viewport = { width: 400, height: 800 };
  const tip = { width: 200, height: 100 };

  it('goes above the anchor, below when there is no room, and stays on screen', () => {
    expect(placeTooltip({ top: 300, bottom: 400, left: 100, width: 100 }, tip, viewport)).toEqual({
      left: 50,
      top: 192,
    });
    expect(placeTooltip({ top: 20, bottom: 120, left: 0, width: 40 }, tip, viewport)).toEqual({ left: 8, top: 128 });
    expect(placeTooltip({ top: 300, bottom: 400, left: 380, width: 20 }, tip, viewport).left).toBe(192);
  });
});

describe('clock skew', () => {
  it('converts server deadlines to the browser clock', () => {
    // The browser is 30 min behind the server: the timer must still read 60 s.
    const serverNow = 2_000_000_000_000;
    const browserNow = serverNow - 30 * 60 * 1000;
    const local = toLocalClock(
      { serverTime: serverNow, turnDeadline: serverNow + 60_000, revealUntil: serverNow + 5_000 },
      browserNow,
    );
    expect(turnClock(browserNow, local.turnDeadline, local.revealUntil)).toEqual({ phase: 'reading', seconds: 5 });
    expect(turnClock(browserNow + 6_000, local.turnDeadline, null)).toEqual({ phase: 'turn', seconds: 54 });
    expect(
      toLocalClock({ serverTime: serverNow, turnDeadline: null, revealUntil: null }, browserNow).turnDeadline,
    ).toBeNull();
  });
});
