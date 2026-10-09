interface Props {
  lines: readonly string[];
  onClose: () => void;
}

// The journal panel opened from the top bar (the lines are already filtered by `useVisibleLog`).
export function EventLog({ lines, onClose }: Props): React.JSX.Element {
  return (
    <aside className="event-log" aria-label="Journal">
      <header>
        <h3 className="eyebrow">Journal</h3>
        <button type="button" className="btn-ghost" onClick={onClose}>
          Fermer
        </button>
      </header>
      <ol>
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
    </aside>
  );
}
