export type SegmentState = 'past' | 'current' | 'future';

// Angular spacing between two neighbours (degrees) and the largest angle a card may reach on the circle.
export const FAN_STEP = 2.6;
export const NARROW_FAN_STEP = 1.5;
// Narrow screens (compact cards, scrolling hand) get a lighter arc.
export function fanStep(narrow: boolean): number {
  return narrow ? NARROW_FAN_STEP : FAN_STEP;
}
const MAX_ANGLE = 10;

export interface FanPose {
  // Rotation of the card, degrees: its angle on the circle.
  angle: number;
  // Vertical offset in radius units (down is positive), the hand edges at 0: (1 - cos θ) - (1 - cos θ_edge).
  offset: number;
}

// Pose of card `index` among `count` cards on one circle: constant angular step, centre highest, y = R (1 - cos θ).
export function fanPose(index: number, count: number, step: number = FAN_STEP): FanPose {
  const gap = Math.min(step, count > 1 ? (2 * MAX_ANGLE) / (count - 1) : step);
  const angle = (index - (count - 1) / 2) * gap;
  const edge = ((count - 1) / 2) * gap;
  const sag = (degrees: number): number => 1 - Math.cos((degrees * Math.PI) / 180);
  return { angle, offset: sag(angle) - sag(edge) };
}

// Radius / pitch between two neighbours: R = pitch / sin(step), so the centres stay on the circle.
export function fanRadiusRatio(step: number = FAN_STEP): number {
  return 1 / Math.sin((step * Math.PI) / 180);
}

// Angular step of the opponent card backs: they are tiny, so a wider step reads as a fan.
export const BACK_STEP = 6;

// The slanted segments under « TOUR n / 6 ».
export function turnSegments(turn: number, max: number): SegmentState[] {
  return Array.from({ length: max }, (_, index) => {
    if (index + 1 < turn) {
      return 'past';
    }
    return index + 1 === turn ? 'current' : 'future';
  });
}
