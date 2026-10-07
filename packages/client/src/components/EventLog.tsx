interface Props {
  lines: readonly string[];
}

export function EventLog({ lines }: Props): React.JSX.Element {
  return (
    <aside className="event-log">
      <h3 className="eyebrow">Journal</h3>
      <ol>
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
    </aside>
  );
}
