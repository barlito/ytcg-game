import { type CardView, type PlayerEvent, OVERHEAT_LIMIT, crisisRule, statusRule } from '@ytcg-game/engine';
import { catalog } from '../catalog.ts';
import type { Scene } from './scene.ts';

export type CardEffect =
  | 'reveal'
  | 'destroy'
  | 'burst'
  | 'power-up'
  | 'power-down'
  | 'status'
  | 'draw'
  | 'moved'
  | 'crisis'
  | 'infect'
  | 'trigger'
  | 'shield-break'
  | 'added'
  | 'cost';

// A card that travels: from where it stood (a move) or from the card or deck that gave it (added to hand).
export type Flight = { kind: 'move' } | { kind: 'add'; from: string | null };

export interface CardFx {
  faceDown: boolean;
  effect: CardEffect | null;
  float: { text: string; tone: string } | null;
  flight: Flight | null;
}

const NONE: CardFx = { faceDown: false, effect: null, float: null, flight: null };

function signed(delta: number): string {
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`;
}

function statusFloat(event: Extract<PlayerEvent, { type: 'statusChanged' }>): string {
  const { name } = statusRule(event.status);
  if (event.spent === true) {
    return event.stacks === 0 ? `${name} brisée` : `${name} −1`;
  }
  if (event.stacks === 0) {
    return `− ${name}`;
  }
  return event.stacks > 1 ? `${name} ×${event.stacks}` : name;
}

type Effect = Pick<CardFx, 'effect' | 'float' | 'flight'>;

function statusEffect(event: Extract<PlayerEvent, { type: 'statusChanged' }>): Effect {
  const tone = `status-${event.status}`;
  const effect = event.spent === true && event.status === 'protected' ? 'shield-break' : 'status';
  return { effect, float: { text: statusFloat(event), tone }, flight: null };
}

// A bare effect, no float, no flight.
const plain = (effect: CardEffect): Effect => ({ effect, float: null, flight: null });

type Handlers = { [K in PlayerEvent['type']]?: (event: Extract<PlayerEvent, { type: K }>) => Effect };

// What each event does to the card it is about.
const ABOUT: Handlers = {
  cardRevealed: () => plain('reveal'),
  cardDestroyed: () => ({ effect: 'destroy', float: { text: 'Détruite', tone: 'down' }, flight: null }),
  powerChanged: (event) => ({
    effect: event.delta > 0 ? 'power-up' : 'power-down',
    float: { text: signed(event.delta), tone: event.delta > 0 ? 'up' : 'down' },
    flight: null,
  }),
  statusChanged: statusEffect,
  cardDrawn: () => plain('draw'),
  cardMoved: () => ({ effect: 'moved', float: null, flight: { kind: 'move' } }),
  crisisStarted: (event) => ({
    effect: 'crisis',
    float: { text: `Folie · ${crisisRule(event.crisis).name}`, tone: 'crisis' },
    flight: null,
  }),
  abilityTriggered: () => plain('trigger'),
  cardAddedToHand: (event) => ({ effect: 'added', float: null, flight: { kind: 'add', from: event.from ?? null } }),
};

function aboutCard(event: PlayerEvent): Effect | null {
  // TypeScript cannot correlate event.type with the matching handler: the table type guarantees it.
  const handler = ABOUT[event.type] as ((event: PlayerEvent) => Effect) | undefined;
  return handler?.(event) ?? null;
}

function cardOf(event: PlayerEvent): string | null {
  return 'card' in event ? event.card : null;
}

function effectOn(event: PlayerEvent, uid: string): Effect | null {
  if (event.type === 'contagionSpread') {
    if (event.from === uid) {
      return plain('trigger');
    }
    return event.to === uid ? plain('infect') : null;
  }
  if (event.type === 'costChanged') {
    return event.card === uid ? plain('cost') : null;
  }
  return cardOf(event) === uid ? aboutCard(event) : null;
}

// How one card looks at this point of the replay.
export function cardFx(scene: Scene, uid: string): CardFx {
  const playing = scene.current === null ? null : effectOn(scene.current, uid);
  return { ...NONE, faceDown: scene.faceDown.has(uid), ...playing };
}

// A card whose destruction is a blast: overheated to the limit, or imploding.
export function explodes(card: CardView): boolean {
  return (card.statuses.overheat ?? 0) >= OVERHEAT_LIMIT || card.crisis === 'implosion';
}

export interface CostFlow {
  from: number;
  to: number;
  delta: number;
}

// The hand cost shown at this point of the replay, and the change playing right now. « Next card » discounts
// have no card: every hand card that differs from its printed cost pulses.
export function costView(scene: Scene, card: CardView): { shown: number; flow: CostFlow | null } {
  const shown = card.cost - (scene.costPending.get(card.uid) ?? 0);
  const { current } = scene;
  if (current?.type !== 'costChanged') {
    return { shown, flow: null };
  }
  if (current.card === card.uid) {
    return { shown, flow: { from: shown - current.delta, to: shown, delta: current.delta } };
  }
  if (current.card === null && shown !== catalog.card(card.defId).cost) {
    return { shown, flow: { from: shown, to: shown, delta: current.delta } };
  }
  return { shown, flow: null };
}

// The card as the replay shows it: the crisis name and the shield appear and go at their own step.
export function sceneCard(scene: Scene, card: CardView): CardView {
  const crisis = scene.crisisPending.has(card.uid) ? null : card.crisis;
  const shield = scene.shielded.has(card.uid) && (card.statuses.protected ?? 0) === 0;
  return { ...card, crisis, statuses: shield ? { ...card.statuses, protected: 1 } : card.statuses };
}
