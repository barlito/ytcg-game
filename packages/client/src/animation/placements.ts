import { type CardView, type PlayerEvent, type PlayerView, STATUS_IDS } from '@ytcg-game/engine';
import { catalog } from '../catalog.ts';

export type Side = 'you' | 'opponent';

// Last known spot of a board card: a destroyed card is gone from the view but still animated.
export interface Placement {
  location: number;
  side: Side;
  // Position in its row, so a ghost stands where the card was.
  index: number;
  card: CardView;
}

export type Placements = ReadonlyMap<string, Placement>;

// A card only known from its reveal event: printed values.
export function printedCard(uid: string, defId: string): CardView {
  const { cost, power } = catalog.card(defId);
  return {
    uid,
    defId,
    cost,
    power,
    breakdown: { printed: power, modifier: 0, ongoing: [] },
    statuses: {},
    crisis: null,
  };
}

// A card that dies in this message is gone from the view: the events keep its last statuses and crisis.
function patchedCard(card: CardView, event: PlayerEvent): CardView {
  if (event.type === 'crisisStarted') {
    return { ...card, crisis: event.crisis };
  }
  return event.type === 'statusChanged' ? { ...card, statuses: statusesAfter(card.statuses, event) } : card;
}

function statusesAfter(
  before: CardView['statuses'],
  event: Extract<PlayerEvent, { type: 'statusChanged' }>,
): CardView['statuses'] {
  const statuses: CardView['statuses'] = {};
  for (const id of STATUS_IDS) {
    const stacks = id === event.status ? event.stacks : (before[id] ?? 0);
    if (stacks !== 0) {
      statuses[id] = stacks;
    }
  }
  return statuses;
}

function applyEvent(next: Map<string, Placement>, view: PlayerView, event: PlayerEvent): void {
  if (event.type === 'cardRevealed' && !next.has(event.card)) {
    const side = event.player === view.you ? 'you' : 'opponent';
    next.set(event.card, { location: event.location, side, index: 0, card: printedCard(event.card, event.defId) });
  }
  if (event.type === 'crisisStarted' || event.type === 'statusChanged') {
    const known = next.get(event.card);
    if (known !== undefined) {
      next.set(event.card, { ...known, card: patchedCard(known.card, event) });
    }
  }
}

export function trackPlacements(previous: Placements, view: PlayerView, events: readonly PlayerEvent[]): Placements {
  const next = new Map(previous);
  for (const event of events) {
    applyEvent(next, view, event);
  }
  for (const location of view.locations) {
    const rows = [
      { side: 'you', cards: [...location.cards.you, ...location.yourPending] },
      { side: 'opponent', cards: location.cards.opponent },
    ] as const;
    for (const { side, cards } of rows) {
      cards.forEach((card, index) => next.set(card.uid, { location: location.index, side, index, card }));
    }
  }
  return next;
}

// Dying cards of that spot that the final view no longer has.
export function ghostsAt(
  placements: Placements,
  dying: ReadonlySet<string>,
  spot: { location: number; side: Side; present: readonly CardView[] },
): CardView[] {
  const present = new Set(spot.present.map((card) => card.uid));
  return [...dying].flatMap((uid) => {
    const placement = placements.get(uid);
    if (placement === undefined || present.has(uid)) {
      return [];
    }
    return placement.location === spot.location && placement.side === spot.side ? [placement.card] : [];
  });
}

// Cards still standing at this spot because their move has not played yet.
export function departingAt(
  placements: Placements,
  unmoved: ReadonlyMap<string, number>,
  spot: { location: number; side: Side },
): CardView[] {
  return [...unmoved].flatMap(([uid, from]) => {
    const placement = placements.get(uid);
    return placement !== undefined && from === spot.location && placement.side === spot.side ? [placement.card] : [];
  });
}

export interface RowCard {
  card: CardView;
  ghost: boolean;
}

// The row of one side: ghosts go back where their card stood, in order.
export function rowWithGhosts(
  placements: Placements,
  standing: readonly CardView[],
  ghosts: readonly CardView[],
): RowCard[] {
  const row: RowCard[] = standing.map((card) => ({ card, ghost: false }));
  const ordered = [...ghosts].sort((a, b) => (placements.get(a.uid)?.index ?? 0) - (placements.get(b.uid)?.index ?? 0));
  for (const card of ordered) {
    row.splice(Math.min(placements.get(card.uid)?.index ?? row.length, row.length), 0, { card, ghost: true });
  }
  return row;
}
