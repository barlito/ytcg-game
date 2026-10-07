import { type PlayerEvent, statusRule } from '@ytcg-game/engine';
import type { SeatInfo } from '@ytcg-game/server/protocol';
import { catalog } from './catalog.ts';

// Instance uid → card definition id, learned from every view received (cards are public once revealed).
export type KnownCards = ReadonlyMap<string, string>;

function cardName(known: KnownCards, uid: string): string {
  const defId = known.get(uid);
  return defId === undefined ? 'Une carte' : (catalog.cards.get(defId)?.name ?? 'Une carte');
}

function seatName(seats: readonly SeatInfo[], player: number): string {
  return seats[player]?.name ?? '?';
}

function signedPower(delta: number): string {
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} puissance`;
}

function statusLine(name: string, event: Extract<PlayerEvent, { type: 'statusChanged' }>): string {
  const adjective = statusRule(event.status).adjective;
  return event.stacks === 0 ? `${name} n'est plus ${adjective}.` : `${name} devient ${adjective}.`;
}

type Formatter<E extends PlayerEvent> = (event: E, known: KnownCards, seats: readonly SeatInfo[]) => string | null;

// One formatter per event type: TypeScript refuses the table if a type is missing.
const FORMATTERS: { [K in PlayerEvent['type']]: Formatter<Extract<PlayerEvent, { type: K }>> } = {
  turnStarted: (event) => `— Tour ${event.turn} —`,
  locationRevealed: () => 'Un nouveau lieu se révèle.',
  cardRevealed: (event, known, seats) => `${seatName(seats, event.player)} révèle ${cardName(known, event.card)}.`,
  handRedrawn: (event, _known, seats) => `${seatName(seats, event.player)} repioche sa main.`,
  revealPriority: (event, _known, seats) => `${seatName(seats, event.player)} révèle en premier.`,
  powerChanged: (event, known) => `${cardName(known, event.card)} : ${signedPower(event.delta)}.`,
  cardDestroyed: (event, known) => `${cardName(known, event.card)} est détruite.`,
  statusChanged: (event, known) => statusLine(cardName(known, event.card), event),
  cardDrawn: () => null,
  gameEnded: () => null,
};

// One line of the game log, or null for events not worth showing.
export function describeEvent(event: PlayerEvent, known: KnownCards, seats: readonly SeatInfo[]): string | null {
  // TypeScript cannot correlate event.type with the matching formatter: the table type guarantees it.
  const format = FORMATTERS[event.type] as Formatter<PlayerEvent>;
  return format(event, known, seats);
}
