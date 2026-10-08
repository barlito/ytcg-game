import type { SeatInfo } from '@ytcg-game/server/protocol';
import { useScene } from '../animation/useReplay.ts';
import { loggedCount } from '../events.ts';

interface Props {
  lines: readonly string[];
  seats: readonly SeatInfo[];
}

// Lines of events the replay has not played yet stay hidden: the journal never spoils a reveal.
export function EventLog({ lines, seats }: Props): React.JSX.Element {
  const held = loggedCount(useScene().unplayed, seats);
  const shown = held === 0 ? lines : lines.slice(0, Math.max(0, lines.length - held));
  return (
    <aside className="event-log">
      <h3 className="eyebrow">Journal</h3>
      <ol>
        {shown.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
    </aside>
  );
}
