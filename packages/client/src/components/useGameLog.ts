import type { CardView, PlayerView } from '@ytcg-game/engine';
import type { GameMessage } from '@ytcg-game/server/protocol';
import { useState } from 'react';
import { describeEvent } from '../events.ts';

function visibleCards(view: PlayerView): CardView[] {
  return [...view.hand, ...view.locations.flatMap((l) => [...l.cards.you, ...l.cards.opponent, ...l.yourPending])];
}

interface Log {
  game: GameMessage | null;
  known: ReadonlyMap<string, string>;
  lines: string[];
}

function append(log: Log, game: GameMessage): Log {
  const known = new Map(log.known);
  for (const event of game.events) {
    if (event.type === 'cardRevealed') {
      known.set(event.card, event.defId);
    }
  }
  for (const card of visibleCards(game.view)) {
    known.set(card.uid, card.defId);
  }
  const added = game.events.flatMap((event) => describeEvent(event, known, game.seats) ?? []);
  return { game, known, lines: added.length === 0 ? log.lines : [...log.lines, ...added].slice(-40) };
}

// The game log and the uid → card map across messages, each message logged once.
export function useGameLog(game: GameMessage): string[] {
  const [log, setLog] = useState<Log>(() => append({ game: null, known: new Map(), lines: [] }, game));
  if (log.game !== game) {
    setLog(append(log, game));
  }
  return log.lines;
}
