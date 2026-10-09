import type { PlayerView } from '@ytcg-game/engine';
import type { SeatInfo } from '@ytcg-game/server/protocol';
import { useEffect, useState } from 'react';
import { useScene } from '../animation/useReplay.ts';
import { turnClock } from '../clock.ts';
import { BACK_STEP, fanPose, fanRadiusRatio, turnSegments } from '../lib/fan.ts';
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

// `arriving`: the last back is the one the replay just added.
function HandBacks({ count, arriving }: { count: number; arriving: boolean }): React.JSX.Element {
  return (
    <span
      className="hand-backs"
      aria-hidden="true"
      style={{ '--fan-ratio': fanRadiusRatio(BACK_STEP) } as React.CSSProperties}
    >
      {Array.from({ length: Math.min(count, 7) }, (_, index) => {
        const { angle, offset } = fanPose(index, Math.min(count, 7), BACK_STEP);
        return (
          <span
            key={index}
            className={arriving && index === Math.min(count, 7) - 1 ? 'mini-back fx-back-in' : 'mini-back'}
            style={{ '--tilt': `${String(angle)}deg`, '--fan-y': offset } as React.CSSProperties}
          />
        );
      })}
    </span>
  );
}

// The opponent hand as the replay shows it: cards they are about to add are not counted yet.
function useOpponentHand(view: PlayerView): { count: number; arriving: boolean } {
  const { current, opponentAdds } = useScene();
  return {
    count: view.opponent.handCount - opponentAdds,
    arriving: current?.type === 'cardAddedToHand' && current.player !== view.you,
  };
}

// Bumps when the replay shows the opponent drawing.
function OpponentCounts({ view, count }: { view: PlayerView; count: number }): React.JSX.Element {
  const { current } = useScene();
  const drawing = current?.type === 'cardDrawn' && current.player !== view.you;
  const adding = current?.type === 'cardAddedToHand' && current.player !== view.you;
  return (
    <span className="status-counts">
      <span className={drawing || adding ? 'hand-count fx-bump' : 'hand-count'}>{count} en main</span> ·{' '}
      {view.opponent.deckCount} au deck
    </span>
  );
}

function OpponentInfo({ view, seats }: { view: PlayerView; seats: SeatInfo[] }): React.JSX.Element {
  const opponent = seats[view.you === 0 ? 1 : 0];
  const name = opponent?.name ?? 'Adversaire';
  const { count, arriving } = useOpponentHand(view);
  return (
    <div className="status-opponent">
      <Avatar name={name} tone="opponent" />
      <div className="status-opponent__text">
        <span className="status-name">{name}</span>
        <OpponentCounts view={view} count={count} />
        <span className="status-badges">
          {view.opponent.pendingCount > 0 && (
            <span className="badge-pending">
              {view.opponent.pendingCount} posée(s)<span className="badge-extra"> face cachée</span>
            </span>
          )}
          {opponent?.connected === false && <span className="badge-warning">déconnecté</span>}
          {view.opponent.ready && view.status !== 'ended' && <span className="badge-ready">a fini son tour</span>}
        </span>
      </div>
      <HandBacks count={count} arriving={arriving} />
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
