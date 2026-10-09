import type { CardView, PlayerEvent, PlayerView } from '@ytcg-game/engine';
import { catalog } from '../catalog.ts';

export type Side = 'you' | 'opponent';

// Last known spot of a board card: a destroyed card is gone from the view but still animated.
export interface Placement {
  location: number;
  side: Side;
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

export function trackPlacements(previous: Placements, view: PlayerView, events: readonly PlayerEvent[]): Placements {
  const next = new Map(previous);
  for (const event of events) {
    if (event.type === 'cardRevealed' && !next.has(event.card)) {
      const side = event.player === view.you ? 'you' : 'opponent';
      next.set(event.card, { location: event.location, side, card: printedCard(event.card, event.defId) });
    }
  }
  for (const location of view.locations) {
    const mine = [...location.cards.you, ...location.yourPending];
    for (const card of mine) {
      next.set(card.uid, { location: location.index, side: 'you', card });
    }
    for (const card of location.cards.opponent) {
      next.set(card.uid, { location: location.index, side: 'opponent', card });
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
