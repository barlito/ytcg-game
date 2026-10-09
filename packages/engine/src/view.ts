import type { CrisisId } from './abilities/crises.ts';
import type { StatusId } from './abilities/statuses.ts';
import type { Catalog } from './catalog.ts';
import {
  type PowerBreakdown,
  costOf,
  locationPowers,
  openLocations,
  playableCards,
  powerBreakdown,
  powerOf,
} from './game.ts';
import { MAX_TURNS } from './rules.ts';
import { type GameEvent, type GameResult, type GameState, type PlayerIndex, opponentOf } from './state.ts';

export interface CardView {
  uid: string;
  defId: string;
  // Effective cost: cost changes included (the printed one is in the catalog).
  cost: number;
  power: number;
  // Where the power comes from: power = printed + modifier + the ongoing amounts.
  breakdown: PowerBreakdown;
  statuses: Partial<Record<StatusId, number>>;
  // The crisis of a mad card without a madness effect of its own (public: the card is revealed).
  crisis: CrisisId | null;
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
    cost: costOf(catalog, state, uid),
    power: powerOf(catalog, state, uid),
    breakdown: powerBreakdown(catalog, state, uid),
    statuses: { ...card.statuses },
    crisis: card.crisis,
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
    openLocations: planning ? openLocations(catalog, state, player) : [],
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

// The opponent's draws and cards added to hand are announced without the card.
export type PlayerEvent =
  | Exclude<GameEvent, { type: 'cardDrawn' | 'cardAddedToHand' }>
  | { type: 'cardDrawn'; player: PlayerIndex; card: string | null }
  | { type: 'cardAddedToHand'; player: PlayerIndex; card: string | null; defId: string | null };

function projectEvent(event: GameEvent, player: PlayerIndex): PlayerEvent | null {
  if (event.type === 'cardDrawn' && event.player !== player) {
    return { ...event, card: null };
  }
  if (event.type === 'cardAddedToHand' && event.player !== player) {
    return { ...event, card: null, defId: null };
  }
  // The opponent never learns what our hand costs.
  if (event.type === 'costChanged' && event.player !== player) {
    return null;
  }
  return event;
}

// Every other event is about public facts (revealed cards, locations, result).
export function projectEventsForPlayer(events: readonly GameEvent[], player: PlayerIndex): PlayerEvent[] {
  return events.flatMap((event) => projectEvent(event, player) ?? []);
}
