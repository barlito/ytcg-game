import type { CardView, CrisisId, PlayerView, StatusId } from '@ytcg-game/engine';
import { catalog } from '../catalog.ts';

// Pure edits of a fabricated view, for the sandbox scenarios.
type Statuses = Partial<Record<StatusId, number>>;

export function mapCards(view: PlayerView, change: (card: CardView) => CardView | null): PlayerView {
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

export function patch(view: PlayerView, uid: string, change: (card: CardView) => CardView): PlayerView {
  return mapCards(view, (card) => (card.uid === uid ? change(card) : card));
}

export function remove(view: PlayerView, uid: string): PlayerView {
  return mapCards(view, (card) => (card.uid === uid ? null : card));
}

export function find(view: PlayerView, uid: string): CardView {
  const all = [...view.hand, ...view.locations.flatMap((l) => [...l.cards.you, ...l.cards.opponent])];
  const card = all.find((candidate) => candidate.uid === uid);
  if (card === undefined) {
    throw new RangeError(`the sandbox board has no card ${uid}`);
  }
  return card;
}

export const powered = (delta: number) => (card: CardView) => ({
  ...card,
  power: Math.max(0, card.power + delta),
  breakdown: { ...card.breakdown, modifier: card.breakdown.modifier + delta },
});

// The card in another form: printed cost and power of that form, permanent modifier and ongoing bonuses kept.
export const evolved = (defId: string) => (card: CardView) => {
  const { cost, power } = catalog.card(defId);
  const ongoing = card.breakdown.ongoing.reduce((sum, bonus) => sum + bonus.amount, 0);
  return {
    ...card,
    defId,
    cost,
    power: power + card.breakdown.modifier + ongoing,
    breakdown: { ...card.breakdown, printed: power },
  };
};

export const withStatuses =
  (statuses: Statuses, crisis: CrisisId | null = null) =>
  (card: CardView) => ({
    ...card,
    statuses: { ...card.statuses, ...statuses },
    crisis: crisis ?? card.crisis,
  });

// Moves a card of your side to another location.
export function relocate(view: PlayerView, uid: string, to: number): PlayerView {
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

export function withTerrain(view: PlayerView, terrains: Record<number, string>, turn: number): PlayerView {
  return {
    ...view,
    turn,
    locations: view.locations.map((location) => ({ ...location, defId: terrains[location.index] ?? location.defId })),
  };
}
