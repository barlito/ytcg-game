import { catalog } from '../../catalog.ts';
import type { LocationRow, Verdict } from '../../lib/endgame.ts';
import { Notched } from '../ui/Notched.tsx';

const OWNER = { you: 'Ton terrain', opponent: 'Terrain adverse' } as const;
const PILL: Record<Verdict, string> = { won: 'Gagné', lost: 'Perdu', tie: 'Égalité' };
const TONE = { won: 'you', lost: 'opponent', tie: 'default' } as const;

function Row({ row, position }: { row: LocationRow; position: number }): React.JSX.Element {
  const name = row.defId === null ? `Lieu ${String(row.index + 1)}` : catalog.location(row.defId).name;
  return (
    <li className={`result-row is-${row.verdict}`} style={{ '--step': position } as React.CSSProperties}>
      <Notched tone={TONE[row.verdict]} className="result-row__panel">
        <span className="result-row__name">
          <strong>{name}</strong>
          <small>{row.chosenBy === null ? 'Terrain aléatoire' : OWNER[row.chosenBy]}</small>
        </span>
        <span className="result-row__score">
          <span className={row.verdict === 'won' ? 'is-you' : ''}>{row.you}</span>
          <i>–</i>
          <span className={row.verdict === 'lost' ? 'is-opponent' : ''}>{row.opponent}</span>
        </span>
        <span className={`result-pill is-${row.verdict}`}>{PILL[row.verdict]}</span>
      </Notched>
    </li>
  );
}

// The three locations, entering one after the other (300 ms apart).
export function ResultRows({ rows }: { rows: readonly LocationRow[] }): React.JSX.Element | null {
  if (rows.length === 0) {
    return null;
  }
  return (
    <ol className="result-rows" aria-label="Résultat par lieu">
      {rows.map((row, position) => (
        <Row key={row.index} row={row} position={position} />
      ))}
    </ol>
  );
}
