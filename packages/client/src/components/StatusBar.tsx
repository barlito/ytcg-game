import type { PlayerView } from '@ytcg-game/engine';
import type { SeatInfo } from '@ytcg-game/server/protocol';
import { useEffect, useState } from 'react';
import { useScene } from '../animation/useReplay.ts';
import { turnClock } from '../clock.ts';

interface Props {
  view: PlayerView;
  seats: SeatInfo[];
  turnDeadline: number | null;
  revealUntil: number | null;
  onEndTurn: () => void;
  onMulligan: () => void;
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return now;
}

function TurnInfo({
  view,
  turnDeadline,
  revealUntil,
}: Pick<Props, 'view' | 'turnDeadline' | 'revealUntil'>): React.JSX.Element {
  const clock = turnClock(useNow(), turnDeadline, revealUntil);
  return (
    <div className="status-turn">
      Tour <strong>{view.turn}</strong>/{view.maxTurns}
      {clock?.phase === 'reading' && (
        <span className="timer is-reading" title="Le chrono du tour démarre après la lecture des révélations">
          Révélations · {clock.seconds} s
        </span>
      )}
      {clock?.phase === 'turn' && (
        <span className={clock.seconds <= 10 ? 'timer is-urgent' : 'timer'}>{clock.seconds} s</span>
      )}
    </div>
  );
}

// Bumps when the replay shows the opponent drawing.
function OpponentHand({ view }: { view: PlayerView }): React.JSX.Element {
  const { current } = useScene();
  const drawing = current?.type === 'cardDrawn' && current.player !== view.you;
  return <span className={drawing ? 'hand-count fx-bump' : 'hand-count'}>{view.opponent.handCount} en main</span>;
}

function OpponentInfo({ view, seats }: { view: PlayerView; seats: SeatInfo[] }): React.JSX.Element {
  const opponent = seats[view.you === 0 ? 1 : 0];
  return (
    <div className="status-opponent">
      {opponent?.name ?? 'Adversaire'} · <OpponentHand view={view} />
      {view.opponent.pendingCount > 0 && (
        <span className="badge-pending">{view.opponent.pendingCount} posée(s) face cachée</span>
      )}
      {opponent?.connected === false && <span className="badge-warning">déconnecté</span>}
      {view.opponent.ready && view.status !== 'ended' && <span className="badge-ready">a fini son tour</span>}
    </div>
  );
}

export function StatusBar(props: Props): React.JSX.Element {
  const { view, onEndTurn, onMulligan } = props;
  return (
    <div className="status-bar">
      <TurnInfo view={view} turnDeadline={props.turnDeadline} revealUntil={props.revealUntil} />
      <div className="status-energy">
        Énergie <strong>{view.energy - view.spent}</strong>/{view.energy}
      </div>
      <OpponentInfo view={view} seats={props.seats} />
      {view.canMulligan && (
        <button type="button" className="btn-ghost" onClick={onMulligan}>
          Repiocher ma main
        </button>
      )}
      {view.status === 'ended' ? (
        <span className="status-ended">Partie terminée</span>
      ) : (
        <button type="button" className="btn-arcade" disabled={view.ready} onClick={onEndTurn}>
          {view.ready ? 'En attente de l’adversaire…' : 'Fin du tour'}
        </button>
      )}
    </div>
  );
}
