import type { PlayerEvent, PlayerIndex } from '@ytcg-game/engine';
import type { SeatInfo } from '@ytcg-game/server/protocol';
import { useScene } from '../animation/useReplay.ts';

interface Props {
  you: PlayerIndex;
  seats: readonly SeatInfo[];
  onSkip: () => void;
}

function who(player: PlayerIndex, you: PlayerIndex, seats: readonly SeatInfo[]): string {
  return player === you ? 'Tu' : (seats[player]?.name ?? "L'adversaire");
}

type Announce = (event: PlayerEvent, you: PlayerIndex, seats: readonly SeatInfo[]) => string;

// Big centered announcements of the replay; card-level events animate on the cards themselves.
const ANNOUNCES: Partial<Record<PlayerEvent['type'], Announce>> = {
  turnStarted: (event) => (event.type === 'turnStarted' ? `Tour ${event.turn}` : ''),
  revealPriority: (event, you, seats) =>
    'player' in event && event.player !== you
      ? `${who(event.player, you, seats)} révèle en premier`
      : 'Tu révèles en premier',
  handRedrawn: (event, you, seats) =>
    'player' in event && event.player !== you
      ? `${who(event.player, you, seats)} repioche sa main`
      : 'Tu repioches ta main',
  locationRevealed: () => 'Un lieu se révèle',
  gameEnded: () => 'Fin de la partie',
};

export function bannerText(event: PlayerEvent, you: PlayerIndex, seats: readonly SeatInfo[]): string | null {
  return ANNOUNCES[event.type]?.(event, you, seats) ?? null;
}

export function ReplayBanner({ you, seats, onSkip }: Props): React.JSX.Element | null {
  const { current } = useScene();
  if (current === null) {
    return null;
  }
  const text = bannerText(current, you, seats);
  return (
    <>
      {text !== null && (
        <p key={JSON.stringify(current)} className="replay-banner" aria-live="polite">
          {text}
        </p>
      )}
      <button type="button" className="replay-skip btn-ghost" onClick={onSkip}>
        Passer l’animation
      </button>
    </>
  );
}
