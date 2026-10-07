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

// One line of the game log, or null for events not worth showing.
export function describeEvent(event: PlayerEvent, known: KnownCards, seats: readonly SeatInfo[]): string | null {
  switch (event.type) {
    case 'turnStarted':
      return `— Tour ${event.turn} —`;
    case 'locationRevealed':
      return `Un nouveau lieu se révèle.`;
    case 'cardRevealed':
      return `${seatName(seats, event.player)} révèle ${cardName(known, event.card)}.`;
    case 'powerChanged':
      return `${cardName(known, event.card)} : ${signedPower(event.delta)}.`;
    case 'cardDestroyed':
      return `${cardName(known, event.card)} est détruite.`;
    case 'statusChanged':
      return statusLine(cardName(known, event.card), event);
    case 'revealPriority':
      return `${seatName(seats, event.player)} révèle en premier.`;
    case 'cardDrawn':
    case 'gameEnded':
      return null;
  }
}
