import { useEffect, useState } from 'react';

const STEP_MS = 120;
// A long jump still ends within this time.
const MAX_COUNT_MS = 900;

// Milliseconds between two steps of a counter running `distance` units.
export function stepDelay(distance: number): number {
  return distance <= 0 ? STEP_MS : Math.min(STEP_MS, Math.floor(MAX_COUNT_MS / distance));
}

// From `from` to `to` one unit at a time, starting after `delay` ms.
export function useCountSteps(from: number, to: number, delay: number): number {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (from === to) {
      return;
    }
    const direction = Math.sign(to - from);
    let current = from;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(
        () => {
          current += direction;
          setValue(current);
          if (current === to) {
            clearInterval(interval);
          }
        },
        stepDelay(Math.abs(to - from)),
      );
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [from, to, delay]);
  return value;
}
