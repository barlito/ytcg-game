import { type CardView, STATUS_IDS, type StatusId, statusRule } from '@ytcg-game/engine';
import { type States, stacksOf } from './cardStates.ts';

// The status a pill names, to colour it (the label always starts with the status name).
function pillStatus(label: string, states: States): { id: StatusId; stacks: number } | null {
  const id = STATUS_IDS.find((status) => label.startsWith(statusRule(status).name));
  return id === undefined ? null : { id, stacks: Math.max(1, stacksOf(states, id)) };
}

interface Props {
  labels: readonly string[];
  states: CardView['statuses'] | undefined;
}

// Status pills glued to the left edge (« Folie », « Défonce ×2 »).
export function StatusPills({ labels, states }: Props): React.JSX.Element | null {
  if (labels.length === 0) {
    return null;
  }
  return (
    <span className="tcard__statuses">
      {labels.map((label) => {
        const status = pillStatus(label, states);
        return (
          <span
            key={label}
            className="pip"
            data-status={status?.id}
            style={status === null ? undefined : ({ '--stacks': status.stacks } as React.CSSProperties)}
          >
            {label}
          </span>
        );
      })}
    </span>
  );
}
