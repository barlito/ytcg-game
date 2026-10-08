import { type CardView, type PlayerView, describeCard, describeLocation } from '@ytcg-game/engine';
import type { SeatInfo } from '@ytcg-game/server/protocol';
import { catalog } from '../catalog.ts';
import { printedCard } from './placements.ts';
import type { SpotlightEvent } from './queue.ts';

export type SpotlightContent =
  | { kind: 'card'; card: CardView; owner: string; side: 'you' | 'opponent'; place: string; text: string[] }
  | { kind: 'location'; defId: string; owner: string; text: string[] };

const TERRAIN_OWNER = { you: 'Ton terrain', opponent: 'Terrain adverse' } as const;

export function placeName(view: PlayerView, index: number): string {
  const defId = view.locations[index]?.defId ?? null;
  return defId === null ? `Lieu ${String(index + 1)}` : catalog.location(defId).name;
}

function terrainOwner(view: PlayerView, index: number, seats: readonly SeatInfo[]): string {
  const chosenBy = view.locations[index]?.chosenBy ?? null;
  if (chosenBy === null) {
    return 'Terrain neutre';
  }
  const name = seats[view.you === 0 ? 1 : 0]?.name;
  return chosenBy === 'opponent' && name !== undefined ? `Terrain de ${name}` : TERRAIN_OWNER[chosenBy];
}

// What the enlarged reveal shows: the card as printed (its on-reveal effects play after it lands), or the terrain.
export function spotlightContent(
  event: SpotlightEvent,
  view: PlayerView,
  seats: readonly SeatInfo[],
): SpotlightContent | null {
  if (event.type === 'locationRevealed') {
    const defId = view.locations[event.location]?.defId ?? null;
    if (defId === null) {
      return null;
    }
    const text = describeLocation(catalog, catalog.location(defId));
    return { kind: 'location', defId, owner: terrainOwner(view, event.location, seats), text };
  }
  const yours = event.player === view.you;
  return {
    kind: 'card',
    card: printedCard(event.card, event.defId),
    owner: yours ? 'Toi' : (seats[event.player]?.name ?? 'Adversaire'),
    side: yours ? 'you' : 'opponent',
    place: placeName(view, event.location),
    text: describeCard(catalog, catalog.card(event.defId)),
  };
}

// The board element the enlarged card flies to (data attributes set by CardButton and LocationHeader).
export function spotlightTarget(event: SpotlightEvent): string {
  return event.type === 'cardRevealed'
    ? `[data-uid="${event.card}"]`
    : `[data-location-header="${String(event.location)}"]`;
}
