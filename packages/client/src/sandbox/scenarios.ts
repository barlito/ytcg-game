import type { CardView, CrisisId, PlayerEvent, PlayerView, StatusId } from '@ytcg-game/engine';
import { TERRAIN_CLOSED, TERRAIN_OPENS, TERRAIN_THREE } from './terrains.ts';

// Each scenario turns the base board into the FINAL view of a fabricated resolution, plus the events the replay plays.
export interface Outcome {
  view: PlayerView;
  events: PlayerEvent[];
}

export interface Scenario {
  label: string;
  run: (view: PlayerView) => Outcome;
}

type Statuses = Partial<Record<StatusId, number>>;

function mapCards(view: PlayerView, change: (card: CardView) => CardView | null): PlayerView {
  const keep = (cards: CardView[]): CardView[] => cards.flatMap((card) => change(card) ?? []);
  return {
    ...view,
    hand: keep(view.hand),
    locations: view.locations.map((location) => ({
      ...location,
      cards: { you: keep(location.cards.you), opponent: keep(location.cards.opponent) },
      yourPending: keep(location.yourPending),
    })),
  };
}

function patch(view: PlayerView, uid: string, change: (card: CardView) => CardView): PlayerView {
  return mapCards(view, (card) => (card.uid === uid ? change(card) : card));
}

function remove(view: PlayerView, uid: string): PlayerView {
  return mapCards(view, (card) => (card.uid === uid ? null : card));
}

function find(view: PlayerView, uid: string): CardView {
  const all = [...view.hand, ...view.locations.flatMap((l) => [...l.cards.you, ...l.cards.opponent])];
  const card = all.find((candidate) => candidate.uid === uid);
  if (card === undefined) {
    throw new RangeError(`the sandbox board has no card ${uid}`);
  }
  return card;
}

const powered = (delta: number) => (card: CardView) => ({
  ...card,
  power: Math.max(0, card.power + delta),
  breakdown: { ...card.breakdown, modifier: card.breakdown.modifier + delta },
});

const withStatuses =
  (statuses: Statuses, crisis: CrisisId | null = null) =>
  (card: CardView) => ({
    ...card,
    statuses: { ...card.statuses, ...statuses },
    crisis: crisis ?? card.crisis,
  });

// Moves a card of your side to another location.
function relocate(view: PlayerView, uid: string, to: number): PlayerView {
  const card = find(view, uid);
  const removed = remove(view, uid);
  return {
    ...removed,
    locations: removed.locations.map((location) =>
      location.index === to
        ? { ...location, cards: { ...location.cards, you: [...location.cards.you, card] } }
        : location,
    ),
  };
}

function withTerrain(view: PlayerView, terrains: Record<number, string>, turn: number): PlayerView {
  return {
    ...view,
    turn,
    locations: view.locations.map((location) => ({ ...location, defId: terrains[location.index] ?? location.defId })),
  };
}

const status = (card: string, id: StatusId, stacks: number, spent = false): PlayerEvent =>
  spent
    ? { type: 'statusChanged', card, status: id, stacks, spent: true }
    : { type: 'statusChanged', card, status: id, stacks };

function crisis(uid: string, id: CrisisId, power: number): Scenario['run'] {
  return (view) => ({
    view: patch(patch(view, uid, withStatuses({ mad: 1 }, id)), uid, powered(power)),
    events: [status(uid, 'mad', 1), { type: 'crisisStarted', card: uid, crisis: id }],
  });
}

function costs(delta: number, uids: string[]): Scenario['run'] {
  return (view) => ({
    view: uids.reduce((next, uid) => patch(next, uid, (card) => ({ ...card, cost: card.cost + delta })), view),
    events: uids.map((card) => ({ type: 'costChanged', player: 0, card, delta })),
  });
}

function addedToHand(player: 0 | 1, from: string | null): Scenario['run'] {
  const source = from === null ? {} : { from };
  return (view) => {
    if (player === 1) {
      const opponent = { ...view.opponent, handCount: view.opponent.handCount + 1 };
      return {
        view: { ...view, opponent },
        events: [{ type: 'cardAddedToHand', player, card: null, defId: null, ...source }],
      };
    }
    const model = view.hand[2] ?? view.hand[0];
    const added: CardView[] = model === undefined ? [] : [{ ...model, uid: 'hNew' }];
    return {
      view: { ...view, hand: [...view.hand, ...added] },
      events:
        model === undefined ? [] : [{ type: 'cardAddedToHand', player, card: 'hNew', defId: model.defId, ...source }],
    };
  };
}

export const SCENARIO_IDS = [
  'move',
  'wandering',
  'rage',
  'delirium',
  'contagion',
  'implosion',
  'added-card',
  'added-deck',
  'added-opponent',
  'cost-down',
  'cost-up',
  'drunk',
  'shield',
  'shield-break',
  'overheat',
  'overheat-blast',
  'trigger-card',
  'trigger-terrain',
  'trigger-destroyed',
  'terrain-three',
  'terrain-closed',
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

const move = (uid: string, from: number, to: number): PlayerEvent => ({ type: 'cardMoved', card: uid, from, to });
const power = (card: string, delta: number): PlayerEvent => ({ type: 'powerChanged', card, delta });

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  move: { label: 'Déplacement', run: (view) => ({ view: relocate(view, 'y5', 2), events: [move('y5', 1, 2)] }) },
  wandering: {
    label: 'Crise : Errance',
    run: (view) => ({
      view: relocate(patch(view, 'y3', withStatuses({ mad: 1 }, 'wandering')), 'y3', 1),
      events: [{ type: 'crisisStarted', card: 'y3', crisis: 'wandering' }, move('y3', 0, 1)],
    }),
  },
  rage: { label: 'Crise : Rage', run: crisis('y1', 'rage', 2) },
  delirium: { label: 'Crise : Délire', run: crisis('y1', 'delirium', -2) },
  contagion: {
    label: 'Crise : Contagion',
    run: (view) => ({
      view: patch(patch(view, 'o1', withStatuses({}, 'contagion')), 'o2', withStatuses({ mad: 1 }, 'rage')),
      events: [
        { type: 'contagionSpread', from: 'o1', to: 'o2' },
        status('o2', 'mad', 1),
        { type: 'crisisStarted', card: 'o2', crisis: 'rage' },
      ],
    }),
  },
  implosion: {
    label: 'Crise : Implosion',
    run: (view) => ({
      view: patch(remove(view, 'o1'), 'y3', powered(2)),
      events: [{ type: 'cardDestroyed', card: 'o1' }, power('y3', 2)],
    }),
  },
  'added-card': { label: 'Ajout en main (carte)', run: addedToHand(0, 'y0') },
  'added-deck': { label: 'Ajout en main (deck)', run: addedToHand(0, null) },
  'added-opponent': { label: 'Ajout en main (adversaire)', run: addedToHand(1, 'o0') },
  'cost-down': { label: 'Coût −1', run: costs(-1, ['h3', 'h4']) },
  'cost-up': { label: 'Coût +1', run: costs(1, ['h1', 'h2']) },
  drunk: {
    label: 'Ivresse',
    run: (view) => ({
      view: patch(patch(view, 'y1', withStatuses({ drunk: 1 })), 'y1', powered(2)),
      events: [status('y1', 'drunk', 1), power('y1', 2)],
    }),
  },
  shield: {
    label: 'Protection',
    run: (view) => ({
      view: patch(view, 'y1', withStatuses({ protected: 1 })),
      events: [status('y1', 'protected', 1)],
    }),
  },
  'shield-break': {
    label: 'Protection brisée',
    run: (view) => ({ view, events: [status('y1', 'protected', 0, true)] }),
  },
  overheat: {
    label: 'Surchauffe ×2',
    run: (view) => ({
      view: patch(view, 'y1', withStatuses({ overheat: 2 })),
      events: [status('y1', 'overheat', 1), status('y1', 'overheat', 2)],
    }),
  },
  'overheat-blast': {
    label: 'Surchauffe : explosion',
    run: (view) => ({
      view: remove(view, 'y1'),
      events: [status('y1', 'overheat', 3), { type: 'cardDestroyed', card: 'y1' }],
    }),
  },
  'trigger-card': {
    label: 'Réaction d’une carte',
    run: (view) => ({
      view: patch(view, 'y2', powered(1)),
      events: [{ type: 'abilityTriggered', trigger: 'onCardPlayedHere', card: 'y2', location: 0 }, power('y2', 1)],
    }),
  },
  'trigger-terrain': {
    label: 'Réaction d’un terrain',
    run: (view) => ({
      view: patch(view, 'y4', powered(1)),
      events: [{ type: 'abilityTriggered', trigger: 'onCardPlayedHere', card: null, location: 1 }, power('y4', 1)],
    }),
  },
  'trigger-destroyed': {
    label: 'Réaction à la destruction',
    run: (view) => ({
      view: patch(remove(view, 'o3'), 'y0', powered(-3)),
      events: [
        { type: 'cardDestroyed', card: 'o3' },
        { type: 'abilityTriggered', trigger: 'onDestroyed', card: 'o3', location: 0 },
        power('y0', -3),
      ],
    }),
  },
  'terrain-three': {
    label: 'Terrain 3 places',
    run: (view) => ({ view: withTerrain(view, { 2: TERRAIN_THREE }, view.turn), events: [] }),
  },
  'terrain-closed': {
    label: 'Terrain fermé / ouvre au tour 5',
    run: (view) => ({ view: withTerrain(view, { 1: TERRAIN_CLOSED, 2: TERRAIN_OPENS }, 4), events: [] }),
  },
};
