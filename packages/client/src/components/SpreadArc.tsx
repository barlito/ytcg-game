import { useScene } from '../animation/useReplay.ts';

// Draws the arc between two cards, measured on the page when the overlay mounts (no state, no layout read in render).
function aim(svg: SVGSVGElement, from: string, to: string): void {
  const a = document.querySelector(`[data-uid="${from}"]`)?.getBoundingClientRect();
  const b = document.querySelector(`[data-uid="${to}"]`)?.getBoundingClientRect();
  const path = svg.querySelector('path');
  if (a === undefined || b === undefined || path === null) {
    return;
  }
  const [x1, y1] = [a.left + a.width / 2, a.top + a.height / 2];
  const [x2, y2] = [b.left + b.width / 2, b.top + b.height / 2];
  const lift = Math.max(30, Math.hypot(x2 - x1, y2 - y1) * 0.35);
  svg.setAttribute('viewBox', `0 0 ${String(window.innerWidth)} ${String(window.innerHeight)}`);
  path.setAttribute(
    'd',
    `M ${String(x1)} ${String(y1)} Q ${String((x1 + x2) / 2)} ${String(Math.min(y1, y2) - lift)} ${String(x2)} ${String(y2)}`,
  );
}

// Contagion: a magenta arc leaps from the mad card to the one it infects.
export function SpreadArc(): React.JSX.Element | null {
  const { current } = useScene();
  if (current?.type !== 'contagionSpread') {
    return null;
  }
  const { from, to } = current;
  return (
    <svg
      key={`${from}>${to}`}
      className="spread-arc"
      aria-hidden="true"
      ref={(svg) => {
        if (svg !== null) {
          aim(svg, from, to);
        }
      }}
    >
      <path pathLength="1" />
    </svg>
  );
}
