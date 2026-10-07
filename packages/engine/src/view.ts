import type { StatusId } from './abilities/statuses.ts';
import type { Catalog } from './catalog.ts';
import { type PowerBreakdown, locationPowers, openLocations, playableCards, powerBreakdown, powerOf } from './game.ts';
import { MAX_TURNS } from './rules.ts';
import { type GameEvent, type GameResult, type GameState, type PlayerIndex, opponentOf } from './state.ts';

export interface CardView {
  uid: string;
  defId: string;
  cost: number;
  power: number;
  // Where the power comes from: power = printed + modifier + the ongoing amounts.
  breakdown: PowerBreakdown;
  statuses: Partial<Record<StatusId, number>>;
}

export interface LocationView {
  index: number;
  // null while unrevealed: its effect is not known yet.
  defId: string | null;
  // Whose location card it is, once revealed.
  chosenBy: 'you' | 'opponent' | null;
  cards: { you: CardView[]; opponent: CardView[] };
  power: { you: number; opponent: number };
  yourPending: CardView[];
}

export interface PlayerView {
  you: PlayerIndex;
  turn: number;
  maxTurns: number;
  status: GameState['status'];
  energy: number;
  spent: number;
  ready: boolean;
  canMulligan: boolean;
  hand: CardView[];
  // What can be played right now (both empty once the turn is ended): a hand card fits an open location.
  playableCards: string[];
  openLocations: number[];
  deckCount: number;
  // Face-down plays of the opponent this turn: a total only, never where they went.
  opponent: { id: string; handCount: number; deckCount: number; pendingCount: number; ready: boolean };
  locations: LocationView[];
  result: GameResult | null;
}

function chooser(chosenBy: PlayerIndex | null, player: PlayerIndex): 'you' | 'opponent' | null {
  if (chosenBy === null) {
    return null;
  }
  return chosenBy === player ? 'you' : 'opponent';
}

function cardView(catalog: Catalog, state: GameState, uid: string): CardView {
  const card = state.cards[uid];
  if (card === undefined) {
    throw new RangeError(`Unknown card instance "${uid}"`);
  }
  return {
    uid,
    defId: card.defId,
    cost: catalog.card(card.defId).cost,
    power: powerOf(catalog, state, uid),
    breakdown: powerBreakdown(catalog, state, uid),
    statuses: { ...card.statuses },
  };
}

// What one player is allowed to know: opponent hand, deck and face-down cards are reduced to counts.
export function projectForPlayer(catalog: Catalog, state: GameState, player: PlayerIndex): PlayerView {
  const opponent = opponentOf(player);
  const me = state.players[player];
  const them = state.players[opponent];
  const view = (uid: string): CardView => cardView(catalog, state, uid);
  const pendingAt = (uids: readonly string[], index: number): string[] =>
    uids.filter((uid) => state.cards[uid]?.location === index);
  const powers = locationPowers(catalog, state);
  const planning = state.status === 'playing' && !me.ready;

  return {
    you: player,
    turn: state.turn,
    maxTurns: MAX_TURNS,
    status: state.status,
    energy: me.energy,
    spent: me.spent,
    ready: me.ready,
    canMulligan: state.turn === 1 && !me.mulliganUsed && !me.ready && me.pending.length === 0,
    hand: me.hand.map(view),
    playableCards: planning ? playableCards(catalog, state, player) : [],
    openLocations: planning ? openLocations(state, player) : [],
    deckCount: me.deck.length,
    opponent: {
      id: them.id,
      handCount: them.hand.length,
      deckCount: them.deck.length,
      pendingCount: them.pending.length,
      ready: them.ready,
    },
    locations: state.locations.map((location, index) => ({
      index,
      defId: location.revealed ? location.defId : null,
      chosenBy: location.revealed ? chooser(location.chosenBy, player) : null,
      cards: { you: location.cards[player].map(view), opponent: location.cards[opponent].map(view) },
      power: { you: powers[index]?.[player] ?? 0, opponent: powers[index]?.[opponent] ?? 0 },
      yourPending: pendingAt(me.pending, index).map(view),
    })),
    result: state.result,
  };
}

// The opponent's draws are announced without the card drawn.
export type PlayerEvent =
  Exclude<GameEvent, { type: 'cardDrawn' }> | { type: 'cardDrawn'; player: PlayerIndex; card: string | null };

// Every other event is about public facts (revealed cards, locations, result).
export function projectEventsForPlayer(events: readonly GameEvent[], player: PlayerIndex): PlayerEvent[] {
  return events.map((event) =>
    event.type === 'cardDrawn' && event.player !== player ? { ...event, card: null } : event,
  );
}
