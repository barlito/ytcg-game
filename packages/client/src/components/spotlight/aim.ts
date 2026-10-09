import { SPOTLIGHT_MS } from '../../animation/queue.ts';

// Sets the flight to the board slot as CSS variables (offsets ignore the running transform).
export function aimAt(selector: string): (figure: HTMLElement | null) => void {
  return (figure) => {
    figure?.style.setProperty('--spot-ms', `${String(SPOTLIGHT_MS)}ms`);
    const target = figure === null ? null : document.querySelector(selector);
    if (figure === null || target === null || figure.offsetWidth === 0) {
      return;
    }
    const box = target.getBoundingClientRect();
    const dx = box.left + box.width / 2 - (figure.offsetLeft + figure.offsetWidth / 2);
    const dy = box.top + box.height / 2 - (figure.offsetTop + figure.offsetHeight / 2);
    figure.style.setProperty('--fly-x', `${String(Math.round(dx))}px`);
    figure.style.setProperty('--fly-y', `${String(Math.round(dy))}px`);
    figure.style.setProperty('--fly-scale', String(Math.max(0.15, box.width / figure.offsetWidth)));
  };
}
