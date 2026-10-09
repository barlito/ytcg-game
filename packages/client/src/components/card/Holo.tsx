import type { CardDefinition } from '@ytcg-game/engine';
import { useState } from 'react';
import { maskUrl } from '../../artwork.ts';
import type { CardSize } from './CardBand.tsx';

interface HoloState {
  // Classes of the card root (`is-holo holo--<preset>`, `is-masked`), empty for a plain card.
  className: string;
  style: React.CSSProperties | undefined;
  // The layers (and the mask download) are mounted: always on big cards, on the first hover for the others.
  lit: boolean;
  arm: () => void;
}

// A holo card carries its ytcg recipe; small cards only fetch the mask and mount the layers once hovered.
export function useHolo(definition: CardDefinition, size: CardSize): HoloState {
  const [armed, setArmed] = useState(false);
  const { holo, mask } = definition;
  if (holo === null) {
    return { className: '', style: undefined, lit: false, arm: () => undefined };
  }
  const lit = armed || size === 'full';
  return {
    className: `is-holo holo--${holo}${mask === null ? '' : ' is-masked'}`,
    // A custom property: React's CSSProperties does not know it.
    style: mask === null || !lit ? undefined : ({ '--mask': `url("${maskUrl(mask)}")` } as React.CSSProperties),
    lit,
    arm: () => {
      setArmed(true);
    },
  };
}

export function HoloLayers(): React.JSX.Element {
  return (
    <>
      <span className="tholo__shine" />
      <span className="tholo__glare" />
    </>
  );
}
