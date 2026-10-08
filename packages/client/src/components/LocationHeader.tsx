import { type LocationView, describeLocation } from '@ytcg-game/engine';
import { useScene } from '../animation/useReplay.ts';
import { catalog } from '../catalog.ts';
import { useTooltipAnchor } from '../lib/useTooltipAnchor.ts';
import { Artwork } from './Artwork.tsx';
import { Tooltip } from './Tooltip.tsx';

const OWNER_LABEL = { you: 'Ton terrain', opponent: 'Terrain adverse' } as const;

function HiddenHeader(): React.JSX.Element {
  return (
    <header className="location-header is-hidden">
      <span className="location-name">Lieu inconnu</span>
      <span className="location-text">Se révèle bientôt.</span>
    </header>
  );
}

function RevealedHeader({
  defId,
  chosenBy,
  index,
}: Pick<LocationView, 'chosenBy' | 'index'> & { defId: string }): React.JSX.Element {
  const scene = useScene();
  const { anchor, setAnchor, id, open, handlers } = useTooltipAnchor(false);
  const location = catalog.location(defId);
  const text = describeLocation(catalog, location).join(' ') || 'Aucun effet.';
  const flipping = scene.current?.type === 'locationRevealed' && scene.current.location === index;
  return (
    <header
      ref={setAnchor}
      className={`location-header${flipping ? ' fx-flip' : ''}`}
      tabIndex={0}
      aria-describedby={open ? id : undefined}
      {...handlers}
    >
      <Artwork key={location.id} image={location.image} className="location-art" />
      {chosenBy !== null && <span className={`location-owner owner-${chosenBy}`}>{OWNER_LABEL[chosenBy]}</span>}
      <span className="location-name">{location.name}</span>
      <span className="location-text">{text}</span>
      {open && (
        <Tooltip anchor={anchor} id={id}>
          <div className="tip-card">
            <p className="tip-title">
              {location.name}
              <span>{catalog.extensions.get(location.extension ?? '') ?? 'Terrain neutre'}</span>
            </p>
            <p className="tip-text">{text}</p>
            <p className="tip-note">Un terrain touche les cartes des deux camps.</p>
          </div>
        </Tooltip>
      )}
    </header>
  );
}

export function LocationHeader({ location }: { location: LocationView }): React.JSX.Element {
  const scene = useScene();
  if (location.defId === null || scene.hiddenLocations.has(location.index)) {
    return <HiddenHeader />;
  }
  return <RevealedHeader defId={location.defId} chosenBy={location.chosenBy} index={location.index} />;
}
