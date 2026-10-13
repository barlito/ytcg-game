import type { CardDefinition, HoloPreset } from '@ytcg-game/engine';
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

// A plain copy never shines; a holo copy of a card without a preset falls back to `basic`, like ytcg.
export function holoPreset(definition: Pick<CardDefinition, 'holo'>, isHolo: boolean): HoloPreset | null {
  return isHolo ? (definition.holo ?? 'basic') : null;
}

// The recipe (preset, mask) comes from the card definition; whether THIS copy is holo is up to the player.
// Small cards only fetch the mask and mount the layers once hovered.
export function useHolo(definition: CardDefinition, size: CardSize, isHolo: boolean): HoloState {
  const [armed, setArmed] = useState(false);
  const { mask } = definition;
  const holo = holoPreset(definition, isHolo);
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
