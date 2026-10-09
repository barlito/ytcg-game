import type { PlayerIndex, PlayerView } from '@ytcg-game/engine';
import type { Outcome, SeatInfo } from '@ytcg-game/server/protocol';
import { useState } from 'react';
import {
  RESULT_TITLE,
  type ResultKind,
  decisiveCard,
  locationRows,
  resultKind,
  resultSubtitle,
  totalPower,
} from '../lib/endgame.ts';
import { DecisiveCardPanel } from './result/DecisiveCardPanel.tsx';
import { ResultRows } from './result/ResultRows.tsx';

interface BarProps {
  kind: ResultKind;
  title: string;
  onUnfold: () => void;
  onLeave: () => void;
}

interface Props {
  outcome: Outcome;
  you: PlayerIndex;
  view: PlayerView;
  seats: readonly SeatInfo[];
  onLeave: () => void;
}

function Ticker({ word }: { word: string }): React.JSX.Element {
  return (
    <div className="result-ticker" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <span key={index}>{`${word.toUpperCase()} ✦`}</span>
      ))}
    </div>
  );
}

function TotalPower({ total }: { total: { you: number; opponent: number } }): React.JSX.Element {
  return (
    <div className="result-total">
      <span className="result-total__label">Puissance totale</span>
      <span className="result-total__value">
        <span
          className="result-count is-you"
          role="img"
          aria-label={String(total.you)}
          style={{ '--target': total.you } as React.CSSProperties}
        />
        <i>–</i>
        <span>{total.opponent}</span>
      </span>
    </div>
  );
}

function ResultBar({ kind, title, onUnfold, onLeave }: BarProps): React.JSX.Element {
  return (
    <div className={`result-bar is-${kind}`} role="dialog" aria-label="Fin de la partie">
      <strong>{title}</strong>
      <button type="button" className="btn-ghost" onClick={onUnfold}>
        Voir le résultat
      </button>
      <button type="button" className="btn-arcade" onClick={onLeave}>
        Retour à l’accueil
      </button>
    </div>
  );
}

function ResultActions({ onFold, onLeave }: { onFold: () => void; onLeave: () => void }): React.JSX.Element {
  return (
    <div className="result-actions">
      <span className="btn-glow">
        <button type="button" className="btn-arcade btn-lg" onClick={onLeave}>
          Retour à l’accueil
        </button>
      </span>
      <button type="button" className="btn-ghost btn-lg" onClick={onFold}>
        Voir le plateau
      </button>
    </div>
  );
}

// Full-screen result over the board: « Voir le plateau » folds it into a bar so the final board stays readable.
export function ResultBanner({ outcome, you, view, seats, onLeave }: Props): React.JSX.Element {
  const [folded, setFolded] = useState(false);
  const kind = resultKind(outcome, you);
  const rows = locationRows(view, view.result);
  const total = totalPower(view.result, you);
  const decisive = decisiveCard(view, view.result);
  const opponent = seats[you === 0 ? 1 : 0]?.name ?? 'l’adversaire';
  const title = RESULT_TITLE[kind];
  const fold = (value: boolean) => () => {
    setFolded(value);
  };
  if (folded) {
    return <ResultBar kind={kind} title={title} onUnfold={fold(false)} onLeave={onLeave} />;
  }
  return (
    <div className={`result is-${kind}`} role="dialog" aria-label="Fin de la partie">
      <Ticker word={title} />
      <div className="result-main">
        <p className="result-eyebrow">
          Fin de la partie · Tour {view.turn} / {view.maxTurns}
        </p>
        <h2 className="result-title">{title}</h2>
        <p className="result-subtitle">{resultSubtitle(outcome, you, rows, opponent)}</p>
        <ResultRows rows={rows} />
        {total !== null && <TotalPower total={total} />}
        <ResultActions onFold={fold(true)} onLeave={onLeave} />
      </div>
      {decisive !== null && <DecisiveCardPanel decisive={decisive} view={view} />}
    </div>
  );
}
