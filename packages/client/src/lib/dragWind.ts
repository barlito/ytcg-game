export interface Wind {
  rx: number;
  ry: number;
  strength: number;
}

export const CALM: Wind = { rx: 0, ry: 0, strength: 0 };

export interface Sample {
  x: number;
  y: number;
  t: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Ported from the hex prototype (useDragWind): the dragged card leans against its velocity.
export function windBetween(previous: Sample, next: Sample, maxTilt = 14): Wind {
  const dt = next.t - previous.t || 16;
  const vx = (next.x - previous.x) / dt;
  const vy = (next.y - previous.y) / dt;
  return {
    rx: clamp(vy * 10, -maxTilt, maxTilt),
    ry: clamp(-vx * 10, -maxTilt, maxTilt),
    strength: clamp(Math.hypot(vx, vy) * 1.8, 0, 1),
  };
}
