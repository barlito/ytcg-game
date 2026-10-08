import type { CardView, PlayerView } from '@ytcg-game/engine';

// A minimal turn-2 view: location 0 holds the given cards, everything playable unless overridden.
export function viewWith(
  cards: { you?: CardView[]; opponent?: CardView[]; pending?: CardView[] },
  overrides: Partial<PlayerView> = {},
): PlayerView {
  return {
    you: 0,
    turn: 2,
    maxTurns: 6,
    status: 'playing',
    energy: 2,
    spent: 0,
    ready: false,
    canMulligan: false,
    hand: [],
    playableCards: [],
    openLocations: [0, 1, 2],
    deckCount: 8,
    opponent: { id: 'bob', handCount: 4, deckCount: 8, pendingCount: 0, ready: false },
    locations: [0, 1, 2].map((index) => ({
      index,
      defId: null,
      chosenBy: null,
      cards: { you: index === 0 ? (cards.you ?? []) : [], opponent: index === 0 ? (cards.opponent ?? []) : [] },
      power: { you: 0, opponent: 0 },
      yourPending: index === 0 ? (cards.pending ?? []) : [],
    })),
    result: null,
    ...overrides,
  };
}
