import { type LocationView, describeLocation } from '@ytcg-game/engine';
import { catalog } from '../catalog.ts';
import { Artwork } from './Artwork.tsx';
import { CardTile } from './CardTile.tsx';

interface Props {
  location: LocationView;
  canPlay: boolean;
  onPlay: () => void;
  onCancel: (uid: string) => void;
}

const OWNER_LABEL = { you: 'Ton terrain', opponent: 'Terrain adverse' } as const;

function LocationHeader({ defId, chosenBy }: Pick<LocationView, 'defId' | 'chosenBy'>): React.JSX.Element {
  if (defId === null) {
    return (
      <header className="location-header is-hidden">
        <span className="location-name">Lieu inconnu</span>
        <span className="location-text">Se révèle bientôt.</span>
      </header>
    );
  }
  const location = catalog.location(defId);
  return (
    <header className="location-header">
      <Artwork key={location.id} image={location.image} className="location-art" />
      {chosenBy !== null && <span className={`location-owner owner-${chosenBy}`}>{OWNER_LABEL[chosenBy]}</span>}
      <span className="location-name">{location.name}</span>
      <span className="location-text">{describeLocation(catalog, location).join(' ') || 'Aucun effet.'}</span>
    </header>
  );
}

export function LocationColumn({ location, canPlay, onPlay, onCancel }: Props): React.JSX.Element {
  const { power } = location;
  const lead = power.you === power.opponent ? 'tie' : power.you > power.opponent ? 'you' : 'opponent';
  return (
    <section className={`location lead-${lead}${canPlay ? ' can-play' : ''}`} onClick={canPlay ? onPlay : undefined}>
      <div className="location-side opponent">
        {location.cards.opponent.map((card) => (
          <CardTile key={card.uid} card={card} />
        ))}
      </div>
      <div className="location-power opponent">{power.opponent}</div>
      <LocationHeader defId={location.defId} chosenBy={location.chosenBy} />
      <div className="location-power you">{power.you}</div>
      <div className="location-side you">
        {location.cards.you.map((card) => (
          <CardTile key={card.uid} card={card} />
        ))}
        {location.yourPending.map((card) => (
          <CardTile
            key={card.uid}
            card={card}
            pending
            onClick={() => {
              onCancel(card.uid);
            }}
          />
        ))}
      </div>
    </section>
  );
}
