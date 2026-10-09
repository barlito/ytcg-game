import type { Catalog } from '../catalog.ts';
import { MAX_HAND } from '../rules.ts';
import type { CardInstance, CostModifier, GameEvent, GameState, PlayerIndex } from '../state.ts';
import { cardAt } from './state-access.ts';

// Hand and cost rules: effective costs, cost changes and cards created in hand.
export interface HandContext {
  readonly catalog: Catalog;
  readonly state: GameState;
  readonly events: GameEvent[];
}

export function newInstance(uid: string, defId: string, owner: PlayerIndex): CardInstance {
  return {
    uid,
    defId,
    owner,
    zone: 'deck',
    location: null,
    powerModifier: 0,
    costModifier: 0,
    paidCost: null,
    usedNextCosts: [],
    playOrder: null,
    statuses: {},
  };
}

function matchesTag(catalog: Catalog, defId: string, tag: string | null): boolean {
  return tag === null || catalog.card(defId).tags.includes(tag);
}

// "Next card played" discounts that apply to a hand card.
function applicableNextCosts({ catalog, state }: HandContext, card: CardInstance): CostModifier[] {
  return state.players[card.owner].nextCosts.filter((entry) => matchesTag(catalog, card.defId, entry.tag));
}

// What a card costs right now: a pending card keeps the price it was paid at. Never below 0.
export function effectiveCost(context: HandContext, uid: string): number {
  const card = cardAt(context.state, uid);
  if (card.zone === 'pending' && card.paidCost !== null) {
    return card.paidCost;
  }
  const base = context.catalog.card(card.defId).cost;
  if (card.zone !== 'hand') {
    return base;
  }
  const next = applicableNextCosts(context, card).reduce((sum, entry) => sum + entry.amount, 0);
  return Math.max(0, base + card.costModifier + next);
}

// Playing a card pays its effective cost and uses up the "next card" discounts that applied to it.
export function payForCard(context: HandContext, uid: string): number {
  const card = cardAt(context.state, uid);
  const cost = effectiveCost(context, uid);
  const used = applicableNextCosts(context, card);
  const player = context.state.players[card.owner];
  player.nextCosts = player.nextCosts.filter((entry) => !used.includes(entry));
  card.paidCost = cost;
  card.usedNextCosts = used;
  return cost;
}

// Cancelling a play gives the energy and the discounts back.
export function refundCard(context: HandContext, uid: string): number {
  const card = cardAt(context.state, uid);
  const refund = card.paidCost ?? 0;
  context.state.players[card.owner].nextCosts.push(...card.usedNextCosts);
  card.paidCost = null;
  card.usedNextCosts = [];
  return refund;
}

export function addHandCost(context: HandContext, player: PlayerIndex, amount: number, tag: string | null): void {
  for (const uid of context.state.players[player].hand) {
    const card = cardAt(context.state, uid);
    if (!matchesTag(context.catalog, card.defId, tag)) {
      continue;
    }
    // The stored change never pushes the printed cost below 0, so a later increase is not eaten.
    const modifier = Math.max(-context.catalog.card(card.defId).cost, card.costModifier + amount);
    const delta = modifier - card.costModifier;
    if (delta !== 0) {
      card.costModifier = modifier;
      context.events.push({ type: 'costChanged', player, card: uid, delta });
    }
  }
}

export function addNextCost(context: HandContext, player: PlayerIndex, amount: number, tag: string | null): void {
  context.state.players[player].nextCosts.push({ amount, tag });
  context.events.push({ type: 'costChanged', player, card: null, delta: amount });
}

export function addToHand(context: HandContext, player: PlayerIndex, defId: string): void {
  const { state, events } = context;
  if (state.players[player].hand.length >= MAX_HAND) {
    return;
  }
  // Instance ids only grow, so a new one never collides with a deck card.
  const uid = `p${player}c${Object.keys(state.cards).length + 1}`;
  const card = newInstance(uid, defId, player);
  card.zone = 'hand';
  state.cards[uid] = card;
  state.players[player].hand.push(uid);
  events.push({ type: 'cardAddedToHand', player, card: uid, defId });
}
