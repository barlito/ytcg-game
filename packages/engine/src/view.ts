import type { StatusId } from './abilities/statuses.ts';
import type { Catalog } from './catalog.ts';
import { locationPowers, powerOf } from './game.ts';
import { MAX_TURNS } from './rules.ts';
import { type GameResult, type GameState, type PlayerIndex, opponentOf } from './state.ts';

export interface CardView {
  uid: string;
  defId: string;
  cost: number;
  power: number;
  statuses: Partial<Record<StatusId, number>>;
}

export interface LocationView {
  index: number;
  // null while unrevealed: its effect is not known yet.
  defId: string | null;
  cards: { you: CardView[]; opponent: CardView[] };
  power: { you: number; opponent: number };
  yourPending: CardView[];
  opponentPendingCount: number;
}

export interface PlayerView {
  you: PlayerIndex;
  turn: number;
  maxTurns: number;
  status: GameState['status'];
  energy: number;
  spent: number;
  ready: boolean;
  hand: CardView[];
  deckCount: number;
  opponent: { id: string; handCount: number; deckCount: number; ready: boolean };
  locations: LocationView[];
  result: GameResult | null;
}

// What one player is allowed to know: opponent hand, deck and face-down cards are reduced to counts.
export function projectForPlayer(catalog: Catalog, state: GameState, player: PlayerIndex): PlayerView {
  const opponent = opponentOf(player);
  const me = state.players[player];
  const them = state.players[opponent];
  const view = (uid: string): CardView => {
    const card = state.cards[uid];
    if (card === undefined) {
      throw new RangeError(`Unknown card instance "${uid}"`);
    }
    return {
      uid,
      defId: card.defId,
      cost: catalog.card(card.defId).cost,
      power: powerOf(catalog, state, uid),
      statuses: { ...card.statuses },
    };
  };
  const pendingAt = (uids: readonly string[], index: number): string[] =>
    uids.filter((uid) => state.cards[uid]?.location === index);
  const powers = locationPowers(catalog, state);

  return {
    you: player,
    turn: state.turn,
    maxTurns: MAX_TURNS,
    status: state.status,
    energy: me.energy,
    spent: me.spent,
    ready: me.ready,
    hand: me.hand.map(view),
    deckCount: me.deck.length,
    opponent: { id: them.id, handCount: them.hand.length, deckCount: them.deck.length, ready: them.ready },
    locations: state.locations.map((location, index) => ({
      index,
      defId: location.revealed ? location.defId : null,
      cards: { you: location.cards[player].map(view), opponent: location.cards[opponent].map(view) },
      power: { you: powers[index]?.[player] ?? 0, opponent: powers[index]?.[opponent] ?? 0 },
      yourPending: pendingAt(me.pending, index).map(view),
      opponentPendingCount: pendingAt(them.pending, index).length,
    })),
    result: state.result,
  };
}
