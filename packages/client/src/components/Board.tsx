import type { ActionInput, GameMessage } from '@ytcg-game/server/protocol';
import { useState } from 'react';
import { isReplaying } from '../animation/scene.ts';
import { ReplayContext, useReplay } from '../animation/useReplay.ts';
import { DuelDnd } from './dnd/DuelDnd.tsx';
import { EventLog } from './EventLog.tsx';
import { HandBar } from './HandBar.tsx';
import { LocationColumn } from './LocationColumn.tsx';
import { ReplayBanner } from './ReplayBanner.tsx';
import { ResultBanner } from './ResultBanner.tsx';
import { Spotlight } from './Spotlight.tsx';
import { StatusBar } from './StatusBar.tsx';
import { useGameLog } from './useGameLog.ts';
import '../styles/board.css';
import '../styles/cards.css';
import '../styles/fx.css';
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

// Lazy-loaded with drag & drop and the replay: the home screen does not pay for them.
export default function Board({ game, send, onLeave }: Props): React.JSX.Element {
  const { view } = game;
  const [selected, setSelected] = useState<string | null>(null);
  const lines = useGameLog(game);
  const { scene, placements, skip } = useReplay(game);
  const selectable = selected !== null && view.playableCards.includes(selected) ? selected : null;
  return (
    <ReplayContext value={{ scene, placements }}>
      <DuelDnd view={view} send={send}>
        <main className={`board${isReplaying(scene) ? ' is-replaying' : ''}`}>
          <StatusBar
            view={view}
            seats={game.seats}
            turnDeadline={game.turnDeadline}
            revealUntil={game.revealUntil}
            onEndTurn={() => {
              send({ type: 'endTurn' });
            }}
            onMulligan={() => {
              send({ type: 'mulligan' });
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
          <HandBar view={view} selected={selectable} onSelect={setSelected} />
          <EventLog lines={lines} seats={game.seats} />
          <Spotlight view={view} seats={game.seats} />
          <ReplayBanner you={view.you} seats={game.seats} onSkip={skip} />
          {game.outcome !== null && !scene.outcomeHeld && (
            <ResultBanner outcome={game.outcome} you={view.you} onLeave={onLeave} />
          )}
        </main>
      </DuelDnd>
    </ReplayContext>
  );
}
