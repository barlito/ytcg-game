import { type CardView, type PlayerEvent, type PlayerView, describeCard, describeLocation } from '@ytcg-game/engine';
import type { SeatInfo } from '@ytcg-game/server/protocol';
import { catalog } from '../catalog.ts';
import { rarityKey, type RarityKey } from '../components/card/rarity.ts';
import { printedCard } from './placements.ts';
import { type SpotlightEvent, isSpotlit } from './queue.ts';

export interface CardContent {
  kind: 'card';
  card: CardView;
  owner: string;
  side: 'you' | 'opponent';
  place: string;
  text: string[];
  rarity: RarityKey;
  universe: string;
  // Printed power, then the power once the effects of this reveal played (the counter runs between the two).
  finalPower: number;
}

export type SpotlightContent = CardContent | { kind: 'location'; defId: string; owner: string; text: string[] };

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

// Power of a card after the effects of its own reveal: the powerChanged events up to the next reveal.
export function revealedPower(uid: string, base: number, upcoming: readonly PlayerEvent[]): number {
  const start = upcoming.findIndex((event) => event.type === 'cardRevealed' && event.card === uid);
  if (start < 0) {
    return base;
  }
  const after = upcoming.slice(start + 1);
  const next = after.findIndex(isSpotlit);
  const chain = next < 0 ? after : after.slice(0, next);
  return chain.reduce(
    (power, event) => (event.type === 'powerChanged' && event.card === uid ? power + event.delta : power),
    base,
  );
}

type CardReveal = Extract<SpotlightEvent, { type: 'cardRevealed' }>;

function cardContent(
  event: CardReveal,
  view: PlayerView,
  seats: readonly SeatInfo[],
  upcoming: readonly PlayerEvent[],
): CardContent {
  const yours = event.player === view.you;
  const definition = catalog.card(event.defId);
  return {
    kind: 'card',
    card: printedCard(event.card, event.defId),
    owner: yours ? 'Toi' : (seats[event.player]?.name ?? 'Adversaire'),
    side: yours ? 'you' : 'opponent',
    place: placeName(view, event.location),
    text: describeCard(catalog, definition),
    rarity: rarityKey(definition),
    universe: catalog.extensions.get(definition.extension) ?? '',
    finalPower: revealedPower(event.card, definition.power, upcoming),
  };
}

// What the enlarged reveal shows: the card as printed (its on-reveal effects play after it lands), or the terrain.
export function spotlightContent(
  event: SpotlightEvent,
  view: PlayerView,
  seats: readonly SeatInfo[],
  upcoming: readonly PlayerEvent[] = [],
): SpotlightContent | null {
  if (event.type === 'cardRevealed') {
    return cardContent(event, view, seats, upcoming);
  }
  const defId = view.locations[event.location]?.defId ?? null;
  if (defId === null) {
    return null;
  }
  const text = describeLocation(catalog, catalog.location(defId));
  return { kind: 'location', defId, owner: terrainOwner(view, event.location, seats), text };
}

// The board element the enlarged card flies to (data attributes set by CardButton and LocationHeader).
export function spotlightTarget(event: SpotlightEvent): string {
  return event.type === 'cardRevealed'
    ? `[data-uid="${event.card}"]`
    : `[data-location-header="${String(event.location)}"]`;
}
