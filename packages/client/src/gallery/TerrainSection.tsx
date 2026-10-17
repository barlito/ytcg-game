import { catalog } from '../catalog.ts';
import { Artwork } from '../components/Artwork.tsx';
import { terrainState } from '../lib/terrainRules.ts';
import type { GalleryTerrain } from './gallery.ts';

// Rule pills as on turn 1 (« Ouvre au tour 2 ») plus the closing turn, like the board tile.
function RulePills({ terrain }: { terrain: GalleryTerrain }): React.JSX.Element | null {
  const { pills } = terrainState(terrain.location.rules, 1);
  if (pills.length === 0) {
    return null;
  }
  return (
    <p className="gallery-terrain__rules">
      {pills.map((pill) => (
        <span key={pill} className="chip tone-warn">
          {pill}
        </span>
      ))}
    </p>
  );
}

function TerrainItem({ terrain }: { terrain: GalleryTerrain }): React.JSX.Element {
  const { location, text } = terrain;
  const extension = location.extension === null ? 'Sans univers' : (catalog.extensions.get(location.extension) ?? '');
  return (
    <li className="gallery-terrain">
      <div className="gallery-terrain__art">
        <Artwork key={location.id} image={location.image} className="gallery-terrain__img" />
      </div>
      <div className="gallery-terrain__info">
        <p className="eyebrow">{extension}</p>
        <h3>{location.name}</h3>
        {text.length === 0 ? (
          <p className="gallery-card__text is-empty">Aucun effet.</p>
        ) : (
          text.map((line) => (
            <p key={line} className="gallery-card__text">
              {line}
            </p>
          ))
        )}
        <RulePills terrain={terrain} />
      </div>
    </li>
  );
}

export function TerrainSection({ terrains }: { terrains: readonly GalleryTerrain[] }): React.JSX.Element | null {
  if (terrains.length === 0) {
    return null;
  }
  return (
    <section className="gallery-section" aria-labelledby="ext-terrains">
      <header className="gallery-section__head">
        <h2 id="ext-terrains">Terrains</h2>
        <span className="chip">{terrains.length} terrains</span>
      </header>
      <ul className="gallery-terrains">
        {terrains.map((terrain) => (
          <TerrainItem key={terrain.location.id} terrain={terrain} />
        ))}
      </ul>
    </section>
  );
}
