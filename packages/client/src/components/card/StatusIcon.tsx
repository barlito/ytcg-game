import type { CrisisId, StatusId } from '@ytcg-game/engine';
import { CRISIS_MARK } from './statusBadge.ts';

// 24x24 glyphs, drawn in the colour of the status.
const GLYPHS: Record<StatusId, string> = {
  mad: 'M11 12a1 1 0 1 1 2 0 2.5 2.5 0 1 1-5 0 4 4 0 1 1 8 0 5.5 5.5 0 1 1-11 0',
  high: 'M7 17h10a4 4 0 0 0 .5-8 5 5 0 0 0-9.5 1.5A3.3 3.3 0 0 0 7 17z',
  tough: 'M12 3l8 6-8 12-8-12z',
  drunk: 'M5 5h14l-7 8zM12 13v6M8 19h8',
  protected: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
  overheat: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 2 2 2 0-3-1-5 1-8z',
  asleep: 'M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z',
  charmed: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  marked: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 3v4M12 17v4M3 12h4M17 12h4',
  enraged: 'M13 3 5 14h6l-1 7 8-11h-6z',
};

interface Props {
  id: StatusId;
  stacks: number;
  crisis: CrisisId | null;
  // Accessible name (« Folie : Errance »); without it the icon is decorative (the text next to it names it).
  title?: string;
  // Stacks as a digit on the icon (the tooltip writes « ×2 » in its text instead).
  showStacks?: boolean;
  className?: string;
}

// Round status icon: board card pills and tooltip lines.
export function StatusIcon({ id, stacks, crisis, title, showStacks = true, className = '' }: Props): React.JSX.Element {
  const a11y = title === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': title };
  return (
    <span
      className={`sbadge ${className}`.trim()}
      {...a11y}
      data-status={id}
      style={{ '--stacks': stacks } as React.CSSProperties}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={GLYPHS[id]} />
      </svg>
      {crisis !== null && <i className="sbadge__crisis">{CRISIS_MARK[crisis]}</i>}
      {showStacks && stacks > 1 && <b className="sbadge__n">{stacks}</b>}
    </span>
  );
}
