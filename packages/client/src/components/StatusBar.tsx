import type { PlayerView } from '@ytcg-game/engine';
import type { SeatInfo } from '@ytcg-game/server/protocol';
import { useEffect, useState } from 'react';
import { useScene } from '../animation/useReplay.ts';
import { turnClock } from '../clock.ts';
import { backAngles, turnSegments } from '../lib/fan.ts';
import { Avatar } from './ui/Avatar.tsx';

interface Props {
  view: PlayerView;
  seats: SeatInfo[];
  turnDeadline: number | null;
  revealUntil: number | null;
  journalOpen: boolean;
  onJournal: () => void;
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

function TurnTracker({ view }: { view: PlayerView }): React.JSX.Element {
  return (
    <div className="turn-tracker">
      <p className="turn-tracker__label">
        <span>Tour</span>
        <strong>
          {view.turn} <span>/ {view.maxTurns}</span>
        </strong>
      </p>
      <div className="turn-tracker__segments" aria-hidden="true">
        {turnSegments(view.turn, view.maxTurns).map((state, index) => (
          <span key={index} className={`segment is-${state}`} />
        ))}
      </div>
    </div>
  );
}

function Timer({ turnDeadline, revealUntil }: Pick<Props, 'turnDeadline' | 'revealUntil'>): React.JSX.Element | null {
  const clock = turnClock(useNow(), turnDeadline, revealUntil);
  if (clock === null) {
    return null;
  }
  if (clock.phase === 'reading') {
    return (
      <span className="timer is-reading" title="Le chrono du tour démarre après la lecture des révélations">
        <span className="timer__label">Révélations · </span>
        {clock.seconds} s
      </span>
    );
  }
  return <span className={clock.seconds <= 10 ? 'timer is-urgent' : 'timer'}>{clock.seconds} s</span>;
}

function HandBacks({ count }: { count: number }): React.JSX.Element {
  return (
    <span className="hand-backs" aria-hidden="true">
      {backAngles(count).map((angle, index) => (
        <span key={index} className="mini-back" style={{ '--tilt': `${String(angle)}deg` } as React.CSSProperties} />
      ))}
    </span>
  );
}

// Bumps when the replay shows the opponent drawing.
function OpponentCounts({ view }: { view: PlayerView }): React.JSX.Element {
  const { current } = useScene();
  const drawing = current?.type === 'cardDrawn' && current.player !== view.you;
  return (
    <span className="status-counts">
      <span className={drawing ? 'hand-count fx-bump' : 'hand-count'}>{view.opponent.handCount} en main</span> ·{' '}
      {view.opponent.deckCount} au deck
    </span>
  );
}

function OpponentInfo({ view, seats }: { view: PlayerView; seats: SeatInfo[] }): React.JSX.Element {
  const opponent = seats[view.you === 0 ? 1 : 0];
  const name = opponent?.name ?? 'Adversaire';
  return (
    <div className="status-opponent">
      <Avatar name={name} tone="opponent" />
      <div className="status-opponent__text">
        <span className="status-name">{name}</span>
        <OpponentCounts view={view} />
        <span className="status-badges">
          {view.opponent.pendingCount > 0 && (
            <span className="badge-pending">{view.opponent.pendingCount} posée(s) face cachée</span>
          )}
          {opponent?.connected === false && <span className="badge-warning">déconnecté</span>}
          {view.opponent.ready && view.status !== 'ended' && <span className="badge-ready">a fini son tour</span>}
        </span>
      </div>
      <HandBacks count={view.opponent.handCount} />
    </div>
  );
}

export function StatusBar(props: Props): React.JSX.Element {
  const { view, journalOpen, onJournal } = props;
  return (
    <header className="topbar">
      <OpponentInfo view={view} seats={props.seats} />
      <TurnTracker view={view} />
      <div className="topbar__right">
        <Timer turnDeadline={props.turnDeadline} revealUntil={props.revealUntil} />
        <button type="button" className="btn-ghost btn-journal" aria-expanded={journalOpen} onClick={onJournal}>
          Journal
        </button>
      </div>
    </header>
  );
}
