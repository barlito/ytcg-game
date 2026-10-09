import { catalog } from '../../catalog.ts';
import { Artwork } from '../Artwork.tsx';
import { EffectBlock, InfoPanel } from './EffectPanel.tsx';
import { aimAt } from './aim.ts';

interface Props {
  defId: string;
  owner: string;
  text: readonly string[];
  target: string;
}

// A terrain rises (no flip: it is already face up), with who chose it and its effect.
export function TerrainSpotlight({ defId, owner, text, target }: Props): React.JSX.Element {
  const location = catalog.location(defId);
  return (
    <div className="spotlight__panel is-terrain">
      <div ref={aimAt(target)} className="spotlight__stage">
        <div className="spotlight__terrain">
          <Artwork image={location.image} className="spotlight__terrain-art" />
        </div>
      </div>
      <InfoPanel
        eyebrow={`Un lieu se révèle · ${owner}`}
        name={location.name}
        meta={catalog.extensions.get(location.extension ?? '') ?? 'Terrain neutre'}
      >
        <EffectBlock text={text} />
        <p className="spotlight__text is-empty">Un terrain touche les cartes des deux camps.</p>
      </InfoPanel>
    </div>
  );
}
