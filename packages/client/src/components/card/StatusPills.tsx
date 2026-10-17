import type { CardView } from '@ytcg-game/engine';
import type { CardSize } from './CardBand.tsx';
import { StatusIcon } from './StatusIcon.tsx';
import { statusBadge } from './statusBadge.ts';

interface Props {
  labels: readonly string[];
  states: CardView['statuses'] | undefined;
  size: CardSize;
}

// Status marks glued to the left edge: text pills on full cards (« Folie · Errance », « Défonce ×2 »), one small
// icon per status (stacks as a digit, Folie carries its crisis) on the board.
export function StatusPills({ labels, states, size }: Props): React.JSX.Element | null {
  if (labels.length === 0) {
    return null;
  }
  return (
    <span className="tcard__statuses">
      {labels.map((label) => {
        const badge = statusBadge(label, states);
        if (size !== 'full' && badge !== null) {
          return (
            <StatusIcon key={label} id={badge.id} stacks={badge.stacks} crisis={badge.crisis} title={badge.title} />
          );
        }
        return (
          <span
            key={label}
            className="pip"
            title={label}
            data-status={badge?.id}
            style={badge === null ? undefined : ({ '--stacks': badge.stacks } as React.CSSProperties)}
          >
            {label}
          </span>
        );
      })}
    </span>
  );
}
