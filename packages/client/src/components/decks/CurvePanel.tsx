import { catalog } from '../../catalog.ts';
import { curveBars, curveLines } from '../../decks/curve.ts';

// Bars scale to the fullest bucket, at least 4 cards high (as in the design).
const MIN_SCALE = 4;

// Cost histogram 1…5+ and the engine's curve rules, live; the 5+ bar turns yellow beyond the engine's maximum.
export function CurvePanel({ cards, refusal }: { cards: string[]; refusal: string | null }): React.JSX.Element {
  const bars = curveBars(catalog, cards);
  const lines = curveLines(catalog, cards);
  const over = lines.find((line) => line.kind === 'maximum' && !line.ok);
  const scale = Math.max(MIN_SCALE, ...bars.map((bar) => bar.count));
  // The refusal already names the broken rules once the deck is full.
  const alert = refusal ?? (over === undefined ? null : `${over.text} : ${String(over.actual)} dans ce deck.`);
  return (
    <section className="curve">
      <h2 className="panel-label">Courbe de coûts</h2>
      <ol className="curve__bars" aria-label="Cartes par coût">
        {bars.map((bar, index) => (
          <li key={bar.label} aria-label={`Coût ${bar.label} : ${String(bar.count)}`}>
            <span className="curve__count">{bar.count}</span>
            <span
              className={`curve__bar${index === bars.length - 1 && over !== undefined ? ' is-over' : ''}`}
              style={{ '--h': bar.count / scale } as React.CSSProperties}
            />
            <span className="curve__cost">{bar.label}</span>
          </li>
        ))}
      </ol>
      {alert !== null && (
        <p className="curve__alert" role="status">
          {alert}
        </p>
      )}
      <ul className="curve__rules">
        {lines.map((line) => (
          <li key={line.text} className={line.ok ? 'is-ok' : 'is-ko'}>
            {line.ok ? '✓' : '✗'} {line.text} ({line.actual})
          </li>
        ))}
      </ul>
    </section>
  );
}
