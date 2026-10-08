import { DECK_SIZE } from '@ytcg-game/engine';
import { catalog } from '../../catalog.ts';
import { curveBars, curveLines } from '../../decks/curve.ts';

const BAR_MAX_PX = 80;

// Cost histogram and the engine's curve rules, live.
export function CurvePanel({ cards }: { cards: string[] }): React.JSX.Element {
  const bars = curveBars(catalog, cards);
  const lines = curveLines(catalog, cards);
  return (
    <section className="curve">
      <h2 className="eyebrow">Courbe de coûts</h2>
      <ol className="curve__bars" aria-label="Cartes par coût">
        {bars.map((bar) => (
          <li key={bar.label} aria-label={`Coût ${bar.label} : ${bar.count}`}>
            <span className="curve__count">{bar.count}</span>
            <span className="curve__bar" style={{ height: `${(bar.count / DECK_SIZE) * BAR_MAX_PX}px` }} />
            <span className="curve__cost">{bar.label}</span>
          </li>
        ))}
      </ol>
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
