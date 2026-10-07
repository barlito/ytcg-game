import type { PlayerView } from '@ytcg-game/engine';
import type { SeatInfo } from '@ytcg-game/server/protocol';
import { useEffect, useState } from 'react';

interface Props {
  view: PlayerView;
  seats: SeatInfo[];
  turnDeadline: number | null;
  onEndTurn: () => void;
}

function useSecondsLeft(deadline: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
}

function TurnInfo({ view, turnDeadline }: { view: PlayerView; turnDeadline: number | null }): React.JSX.Element {
  const secondsLeft = useSecondsLeft(turnDeadline);
  return (
    <div className="status-turn">
      Tour <strong>{view.turn}</strong>/{view.maxTurns}
      {secondsLeft !== null && <span className={secondsLeft <= 10 ? 'timer is-urgent' : 'timer'}>{secondsLeft} s</span>}
    </div>
  );
}

function OpponentInfo({ view, seats }: { view: PlayerView; seats: SeatInfo[] }): React.JSX.Element {
  const opponent = seats[view.you === 0 ? 1 : 0];
  return (
    <div className="status-opponent">
      {opponent?.name ?? 'Adversaire'} · {view.opponent.handCount} en main
      {view.opponent.pendingCount > 0 && (
        <span className="badge-pending">{view.opponent.pendingCount} posée(s) face cachée</span>
      )}
      {opponent?.connected === false && <span className="badge-warning">déconnecté</span>}
      {view.opponent.ready && <span className="badge-ready">a fini son tour</span>}
    </div>
  );
}

export function StatusBar({ view, seats, turnDeadline, onEndTurn }: Props): React.JSX.Element {
  return (
    <div className="status-bar">
      <TurnInfo view={view} turnDeadline={turnDeadline} />
      <div className="status-energy">
        Énergie <strong>{view.energy - view.spent}</strong>/{view.energy}
      </div>
      <OpponentInfo view={view} seats={seats} />
      <button type="button" className="btn-arcade" disabled={view.ready || view.status === 'ended'} onClick={onEndTurn}>
        {view.ready ? 'En attente…' : 'Fin du tour'}
      </button>
    </div>
  );
}
