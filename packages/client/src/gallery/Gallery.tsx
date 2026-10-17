import { useMemo, useState } from 'react';
import { catalog } from '../catalog.ts';
import { GalleryCardItem } from './GalleryCardItem.tsx';
import { GalleryFilters } from './GalleryFilters.tsx';
import { TerrainSection } from './TerrainSection.tsx';
import {
  DEFAULT_FILTER,
  type GalleryFilter,
  type GallerySection,
  galleryCards,
  gallerySections,
  galleryTerrains,
  hasEffect,
  terrainMatches,
} from './gallery.ts';
import './gallery.css';

const CARDS = galleryCards(catalog);
const TERRAINS = galleryTerrains(catalog);

function Section({ section }: { section: GallerySection }): React.JSX.Element {
  return (
    <section className="gallery-section" aria-labelledby={`ext-${section.slug}`}>
      <header className="gallery-section__head">
        <h2 id={`ext-${section.slug}`}>{section.name}</h2>
        <span className="chip">{section.total} cartes</span>
        <span className="chip tone-live">{section.withEffect} avec effet</span>
        {section.cards.length < section.total && (
          <span className="chip tone-cyan">{section.cards.length} affichées</span>
        )}
      </header>
      <ul className="gallery-grid">
        {section.cards.map((card) => (
          <GalleryCardItem key={card.definition.id} card={card} />
        ))}
      </ul>
    </section>
  );
}

function Header(): React.JSX.Element {
  const withEffect = CARDS.filter((card) => hasEffect(card.definition)).length;
  return (
    <header className="gallery-header">
      <div>
        <p className="eyebrow">Dev · revue des cartes</p>
        <h1>Galerie des cartes</h1>
        <p className="gallery-header__totals">
          {CARDS.length} cartes · {withEffect} avec effet · {TERRAINS.length} terrains
        </p>
      </div>
      <nav className="gallery-header__links">
        <a className="btn-ghost" href="?sandbox">
          Bac à sable
        </a>
        <a className="btn-ghost" href="/">
          Accueil
        </a>
      </nav>
    </header>
  );
}

// Dev only (?cards): every card and terrain of data/ with its generated text, to review the cards.
export default function Gallery(): React.JSX.Element {
  const [filter, setFilter] = useState<GalleryFilter>(DEFAULT_FILTER);
  const sections = useMemo(() => gallerySections(catalog, CARDS, filter), [filter]);
  const terrains = TERRAINS.filter((terrain) => terrainMatches(terrain, filter));
  const empty = sections.length === 0 && terrains.length === 0;
  return (
    <main className="gallery">
      <Header />
      <GalleryFilters filter={filter} onChange={setFilter} />
      {empty && <p className="gallery-empty">Aucune carte ne correspond.</p>}
      {sections.map((section) => (
        <Section key={section.slug} section={section} />
      ))}
      <TerrainSection terrains={terrains} />
    </main>
  );
}
