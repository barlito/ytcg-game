import type { ActionInput, GameMessage, SeatInfo } from '@ytcg-game/server/protocol';
import type { PlayerView } from '@ytcg-game/engine';
import { useState } from 'react';
import { isReplaying } from '../animation/scene.ts';
import { ReplayContext, useReplay } from '../animation/useReplay.ts';
import { DuelDnd } from './dnd/DuelDnd.tsx';
import { EventLog } from './EventLog.tsx';
import { HandBar } from './HandBar.tsx';
import { LocationColumn } from './LocationColumn.tsx';
import { PlayerPanel } from './PlayerPanel.tsx';
import { ReplayBanner } from './ReplayBanner.tsx';
import { ResultBanner } from './ResultBanner.tsx';
import { Spotlight } from './Spotlight.tsx';
import { SpreadArc } from './SpreadArc.tsx';
import { StatusBar } from './StatusBar.tsx';
import { TurnActions } from './TurnActions.tsx';
import { useGameLog } from './useGameLog.ts';
import { useVisibleLog } from './useVisibleLog.ts';
import '../styles/board.css';
import '../styles/hand.css';
import '../styles/locations.css';
import '../styles/result.css';
import '../styles/cards.css';
import '../styles/fx.css';
import '../styles/fx-effects.css';
import '../styles/spotlight.css';

interface Props {
  game: GameMessage;
  send: (input: ActionInput) => void;
  onLeave: () => void;
}

function Locations({ game, send, selected, onPlayed }: LocationsProps): React.JSX.Element {
  const { view } = game;
  return (
    <div className="locations">
      {view.locations.map((location) => (
        <LocationColumn
          key={location.index}
          location={location}
          view={view}
          selected={selected}
          onPlay={(index) => {
            if (selected !== null) {
              send({ type: 'play', card: selected, location: index });
              onPlayed();
            }
          }}
          onCancel={(uid) => {
            send({ type: 'cancel', card: uid });
          }}
        />
      ))}
    </div>
  );
}

interface LocationsProps extends Pick<Props, 'game' | 'send'> {
  selected: string | null;
  onPlayed: () => void;
}

interface FooterProps extends Pick<Props, 'game' | 'send'> {
  lines: readonly string[];
  selected: string | null;
  onSelect: (uid: string | null) => void;
}

// Your avatar and energy, your hand in a fan, the toast and the end of turn.
function Footer({ game, send, lines, selected, onSelect }: FooterProps): React.JSX.Element {
  const { view } = game;
  const visible = useVisibleLog(lines, game.seats);
  return (
    <div className="board-foot">
      <PlayerPanel view={view} />
      <HandBar view={view} selected={selected} onSelect={onSelect} />
      <TurnActions
        view={view}
        lastLine={visible.at(-1)}
        onEndTurn={() => {
          send({ type: 'endTurn' });
        }}
        onMulligan={() => {
          send({ type: 'mulligan' });
        }}
      />
    </div>
  );
}

function JournalPanel({
  lines,
  seats,
  onClose,
}: {
  lines: readonly string[];
  seats: readonly SeatInfo[];
  onClose: () => void;
}): React.JSX.Element {
  return <EventLog lines={useVisibleLog(lines, seats)} onClose={onClose} />;
}

// Fixed behind the board: violet and magenta radials, scanlines and the perspective grid of the floor.
function Backdrop(): React.JSX.Element {
  return (
    <div className="board-bg" aria-hidden="true">
      <div className="board-bg__floor" />
    </div>
  );
}

// Everything the replay draws above the board: the spotlight, the Contagion arc, the announcements and the skip button.
function ReplayOverlays({
  view,
  seats,
  onSkip,
}: {
  view: PlayerView;
  seats: SeatInfo[];
  onSkip: () => void;
}): React.JSX.Element {
  return (
    <>
      <Spotlight view={view} seats={seats} />
      <SpreadArc />
      <ReplayBanner you={view.you} seats={seats} onSkip={onSkip} />
    </>
  );
}

// Lazy-loaded with drag & drop and the replay: the home screen does not pay for them.
export default function Board({ game, send, onLeave }: Props): React.JSX.Element {
  const { view } = game;
  const [selected, setSelected] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const lines = useGameLog(game);
  const { scene, placements, skip } = useReplay(game);
  const selectable = selected !== null && view.playableCards.includes(selected) ? selected : null;
  return (
    <ReplayContext value={{ scene, placements }}>
      <DuelDnd view={view} send={send}>
        <main className={`board${isReplaying(scene) ? ' is-replaying' : ''}`}>
          <Backdrop />
          <StatusBar
            view={view}
            seats={game.seats}
            turnDeadline={game.turnDeadline}
            revealUntil={game.revealUntil}
            journalOpen={journalOpen}
            onJournal={() => {
              setJournalOpen((open) => !open);
            }}
          />
          <Locations
            game={game}
            send={send}
            selected={selectable}
            onPlayed={() => {
              setSelected(null);
            }}
          />
          <Footer game={game} lines={lines} selected={selectable} onSelect={setSelected} send={send} />
          {journalOpen && (
            <JournalPanel
              lines={lines}
              seats={game.seats}
              onClose={() => {
                setJournalOpen(false);
              }}
            />
          )}
          <ReplayOverlays view={view} seats={game.seats} onSkip={skip} />
          {game.outcome !== null && !scene.outcomeHeld && (
            <ResultBanner outcome={game.outcome} you={view.you} view={view} seats={game.seats} onLeave={onLeave} />
          )}
        </main>
      </DuelDnd>
    </ReplayContext>
  );
}
