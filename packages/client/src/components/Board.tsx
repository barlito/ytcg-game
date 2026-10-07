import type { CardView, PlayerView } from '@ytcg-game/engine';
import type { ActionInput, GameMessage } from '@ytcg-game/server/protocol';
import { useEffect, useRef, useState } from 'react';
import { describeEvent } from '../events.ts';
import { EventLog } from './EventLog.tsx';
import { HandBar } from './HandBar.tsx';
import { LocationColumn } from './LocationColumn.tsx';
import { ResultBanner } from './ResultBanner.tsx';
import { StatusBar } from './StatusBar.tsx';

interface Props {
  game: GameMessage;
  send: (input: ActionInput) => void;
  onLeave: () => void;
}

function visibleCards(view: PlayerView): CardView[] {
  return [...view.hand, ...view.locations.flatMap((l) => [...l.cards.you, ...l.cards.opponent, ...l.yourPending])];
}

// Keeps the game log and the uid → card map across messages, each message logged once.
function useGameLog(game: GameMessage): string[] {
  const known = useRef(new Map<string, string>());
  const logged = useRef<GameMessage | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    if (logged.current === game) {
      return;
    }
    logged.current = game;
    for (const card of visibleCards(game.view)) {
      known.current.set(card.uid, card.defId);
    }
    const added = game.events.flatMap((event) => describeEvent(event, known.current, game.seats) ?? []);
    if (added.length > 0) {
      setLines((current) => [...current, ...added].slice(-40));
    }
  }, [game]);
  return lines;
}

export function Board({ game, send, onLeave }: Props): React.JSX.Element {
  const { view } = game;
  const [selected, setSelected] = useState<string | null>(null);
  const lines = useGameLog(game);
  const locked = view.ready || game.outcome !== null;
  const selectedInHand = selected !== null && view.hand.some((card) => card.uid === selected);

  return (
    <main className="board">
      <StatusBar
        view={view}
        seats={game.seats}
        turnDeadline={game.turnDeadline}
        onEndTurn={() => {
          send({ type: 'endTurn' });
        }}
        onMulligan={() => {
          send({ type: 'mulligan' });
        }}
      />
      <div className="locations">
        {view.locations.map((location) => (
          <LocationColumn
            key={location.index}
            location={location}
            canPlay={!locked && selectedInHand}
            onPlay={() => {
              if (selected !== null) {
                send({ type: 'play', card: selected, location: location.index });
                setSelected(null);
              }
            }}
            onCancel={(uid) => {
              send({ type: 'cancel', card: uid });
            }}
          />
        ))}
      </div>
      <HandBar
        hand={view.hand}
        energyLeft={view.energy - view.spent}
        locked={locked}
        selected={selected}
        onSelect={setSelected}
      />
      <EventLog lines={lines} />
      {game.outcome !== null && <ResultBanner outcome={game.outcome} you={view.you} onLeave={onLeave} />}
    </main>
  );
}
