export type SegmentState = 'past' | 'current' | 'future';

// Rotation of card `index` in a fan of `count` cards, from -spread to +spread degrees.
export function fanAngle(index: number, count: number, spread: number): number {
  if (count <= 1) {
    return 0;
  }
  return Math.round((index / (count - 1) - 0.5) * 2 * spread * 10) / 10;
}

// Mini card backs of the opponent hand (at most `cap`), fanned from -8° to +12° like the design.
export function backAngles(handCount: number, cap = 7): number[] {
  const count = Math.max(0, Math.min(handCount, cap));
  return Array.from({ length: count }, (_, index) => (count === 1 ? 0 : -8 + (20 * index) / (count - 1)));
}

// The slanted segments under « TOUR n / 6 ».
export function turnSegments(turn: number, max: number): SegmentState[] {
  return Array.from({ length: max }, (_, index) => {
    if (index + 1 < turn) {
      return 'past';
    }
    return index + 1 === turn ? 'current' : 'future';
  });
}
