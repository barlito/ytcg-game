import type { PlayerView } from '@ytcg-game/engine';
import type { SeatInfo } from '@ytcg-game/server/protocol';
import { spotlightContent, spotlightTarget } from '../animation/spotlight.ts';
import { useScene } from '../animation/useReplay.ts';
import { CardSpotlight } from './spotlight/CardSpotlight.tsx';
import { TerrainSpotlight } from './spotlight/TerrainSpotlight.tsx';

interface Props {
  view: PlayerView;
  seats: readonly SeatInfo[];
}

// The reveal sequence: overlay with the rarity halo and « RÉVÉLATIONS · TOUR n », the card rises face down and
// flips, the effect panel slides in, the card shrinks to its spot. Never catches the pointer.
export function Spotlight({ view, seats }: Props): React.JSX.Element | null {
  const { spotlight, unplayed } = useScene();
  const content = spotlight === null ? null : spotlightContent(spotlight, view, seats, unplayed);
  if (spotlight === null || content === null) {
    return null;
  }
  const target = spotlightTarget(spotlight);
  return (
    <div
      key={JSON.stringify(spotlight)}
      className="spotlight"
      data-rarity={content.kind === 'card' ? content.rarity : 'common'}
      role="status"
      aria-live="polite"
    >
      <p className="spotlight__label">Révélations · Tour {view.turn}</p>
      {content.kind === 'card' ? (
        <CardSpotlight content={content} target={target} />
      ) : (
        <TerrainSpotlight defId={content.defId} owner={content.owner} text={content.text} target={target} />
      )}
    </div>
  );
}
