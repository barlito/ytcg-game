export const MAX_TURNS = 6;
export const DECK_SIZE = 12;
export const STARTING_HAND = 3;
export const MAX_HAND = 7;
export const LOCATION_COUNT = 3;
export const LOCATION_CAPACITY = 4;

// Deck curve: a minimum of cards per cost, and a cap on the expensive ones.
export const DECK_MINIMUM_BY_COST: readonly { cost: number; count: number }[] = [
  { cost: 1, count: 2 },
  { cost: 2, count: 2 },
  { cost: 3, count: 2 },
];
export const EXPENSIVE_FROM_COST = 5;
export const EXPENSIVE_MAXIMUM = 3;

// Among the cards seen before playing on turn 1 (starting hand + turn draw), one costs OPENING_COST.
export const OPENING_CARDS = STARTING_HAND + 1;
export const OPENING_COST = 1;
