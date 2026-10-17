import type { PlayerEvent, PlayerIndex } from '@ytcg-game/engine';
import type { SeatInfo } from '@ytcg-game/server/protocol';
import { isReplaying } from '../animation/scene.ts';
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

// Big centered announcements of the replay; reveals are spotlighted, other card events animate on the cards.
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
  gameEnded: () => 'Fin de la partie',
};

export function bannerText(event: PlayerEvent, you: PlayerIndex, seats: readonly SeatInfo[]): string | null {
  return ANNOUNCES[event.type]?.(event, you, seats) ?? null;
}

const SKIP_GAP = 12;

// Right above the turn actions (the toast is hidden during the replay): never over the hand nor the end of turn.
export function skipPlacement(
  actions: Pick<DOMRect, 'top' | 'right'>,
  viewport: { width: number; height: number },
): { bottom: number; right: number } {
  return { bottom: viewport.height - actions.top + SKIP_GAP, right: viewport.width - actions.right };
}

// Wide layouts only: on phones the CSS puts it over the energy, bottom left.
function placeSkip(skip: HTMLDivElement | null): void {
  const actions = document.querySelector('.turn-actions');
  if (skip === null || actions === null || window.matchMedia('(max-width: 900px)').matches) {
    return;
  }
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const { bottom, right } = skipPlacement(actions.getBoundingClientRect(), viewport);
  skip.style.bottom = `${String(bottom)}px`;
  skip.style.right = `${String(right)}px`;
}

export function ReplayBanner({ you, seats, onSkip }: Props): React.JSX.Element | null {
  const scene = useScene();
  const { current } = scene;
  if (!isReplaying(scene)) {
    return null;
  }
  const text = current === null ? null : bannerText(current, you, seats);
  return (
    <>
      {text !== null && (
        <p key={JSON.stringify(current)} className="replay-banner" aria-live="polite">
          {text}
        </p>
      )}
      <div ref={placeSkip} className="replay-skip">
        <span>Les effets se jouent après chaque révélation</span>
        <button type="button" className="btn-ghost" onClick={onSkip}>
          Passer l’animation
        </button>
      </div>
    </>
  );
}
