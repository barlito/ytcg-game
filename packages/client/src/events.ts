import { type PlayerEvent, crisisRule, statusRule } from '@ytcg-game/engine';
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

function crisisLine(name: string, event: Extract<PlayerEvent, { type: 'crisisStarted' }>): string {
  return `${name} est prise de folie : ${crisisRule(event.crisis).name}.`;
}

function costLine(event: Extract<PlayerEvent, { type: 'costChanged' }>, known: KnownCards): string {
  const change = `${Math.abs(event.delta)} de ${event.delta < 0 ? 'moins' : 'plus'}`;
  return event.card === null
    ? `La prochaine carte que tu joues coûte ${change}.`
    : `${cardName(known, event.card)} coûte ${change}.`;
}

function addedLine(event: Extract<PlayerEvent, { type: 'cardAddedToHand' }>, seats: readonly SeatInfo[]): string {
  const name = event.defId === null ? 'une carte' : (catalog.cards.get(event.defId)?.name ?? 'une carte');
  return `${seatName(seats, event.player)} ajoute ${name} à sa main.`;
}

type Formatter<E extends PlayerEvent> = (event: E, known: KnownCards, seats: readonly SeatInfo[]) => string | null;

// One formatter per event type: TypeScript refuses the table if a type is missing.
const FORMATTERS: { [K in PlayerEvent['type']]: Formatter<Extract<PlayerEvent, { type: K }>> } = {
  turnStarted: (event) => `— Tour ${event.turn} —`,
  locationRevealed: () => 'Un nouveau lieu se révèle.',
  cardRevealed: (event, _known, seats) =>
    `${seatName(seats, event.player)} révèle ${catalog.cards.get(event.defId)?.name ?? 'une carte'}.`,
  handRedrawn: (event, _known, seats) => `${seatName(seats, event.player)} repioche sa main.`,
  revealPriority: (event, _known, seats) => `${seatName(seats, event.player)} révèle en premier.`,
  powerChanged: (event, known) => `${cardName(known, event.card)} : ${signedPower(event.delta)}.`,
  cardDestroyed: (event, known) => `${cardName(known, event.card)} est détruite.`,
  statusChanged: (event, known) => statusLine(cardName(known, event.card), event),
  crisisStarted: (event, known) => crisisLine(cardName(known, event.card), event),
  cardMoved: (event, known) =>
    `${cardName(known, event.card)} passe du lieu ${event.from + 1} au lieu ${event.to + 1}.`,
  costChanged: (event, known) => costLine(event, known),
  cardAddedToHand: (event, _known, seats) => addedLine(event, seats),
  cardDrawn: () => null,
  gameEnded: () => null,
};

// One line of the game log, or null for events not worth showing.
export function describeEvent(event: PlayerEvent, known: KnownCards, seats: readonly SeatInfo[]): string | null {
  // TypeScript cannot correlate event.type with the matching formatter: the table type guarantees it.
  const format = FORMATTERS[event.type] as Formatter<PlayerEvent>;
  return format(event, known, seats);
}

// Journal lines these events will print (an unknown card still prints a line).
export function loggedCount(events: readonly PlayerEvent[], seats: readonly SeatInfo[]): number {
  return events.filter((event) => describeEvent(event, new Map(), seats) !== null).length;
}
