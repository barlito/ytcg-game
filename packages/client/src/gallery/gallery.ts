import {
  type CardDefinition,
  type Catalog,
  type LocationDefinition,
  describeCard,
  describeLocation,
} from '@ytcg-game/engine';
import { type RarityKey, rarityKey } from '../components/card/rarity.ts';

export type CostSort = 'catalog' | 'costAsc' | 'costDesc';

export interface GalleryFilter {
  // Universe slug, null = every extension.
  extension: string | null;
  rarity: RarityKey | null;
  query: string;
  // Only the cards without any ability.
  noEffect: boolean;
  sort: CostSort;
}

export const DEFAULT_FILTER: GalleryFilter = {
  extension: null,
  rarity: null,
  query: '',
  noEffect: false,
  sort: 'catalog',
};

export interface GalleryCard {
  definition: CardDefinition;
  text: readonly string[];
  // Name and text, lower case without accents.
  haystack: string;
}

export interface GalleryTerrain {
  location: LocationDefinition;
  text: readonly string[];
  haystack: string;
}

export interface GallerySection {
  slug: string;
  name: string;
  // Counts of the whole extension, whatever the filter.
  total: number;
  withEffect: number;
  cards: GalleryCard[];
}

// Lower case, accents and curly quotes folded: « Élu » matches « elu ».
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[’‘]/g, "'").toLowerCase().trim();
}

export function hasEffect(definition: CardDefinition): boolean {
  return definition.abilities.length > 0;
}

// Every card of the catalog in data order, with its generated text.
export function galleryCards(catalog: Catalog): GalleryCard[] {
  return [...catalog.cards.values()].map((definition) => {
    const text = describeCard(catalog, definition);
    return { definition, text, haystack: normalize([definition.name, ...text].join(' ')) };
  });
}

export function galleryTerrains(catalog: Catalog): GalleryTerrain[] {
  return [...catalog.locations.values()].map((location) => {
    const text = describeLocation(catalog, location);
    return { location, text, haystack: normalize([location.name, ...text].join(' ')) };
  });
}

function queryMatches(haystack: string, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return words.every((word) => haystack.includes(word));
}

export function cardMatches(card: GalleryCard, filter: GalleryFilter): boolean {
  const { definition } = card;
  if (filter.extension !== null && definition.extension !== filter.extension) {
    return false;
  }
  if (filter.rarity !== null && rarityKey(definition) !== filter.rarity) {
    return false;
  }
  if (filter.noEffect && hasEffect(definition)) {
    return false;
  }
  return queryMatches(card.haystack, filter.query);
}

// Stable: equal costs keep the data order.
export function sortCards(cards: readonly GalleryCard[], sort: CostSort): GalleryCard[] {
  if (sort === 'catalog') {
    return [...cards];
  }
  const sign = sort === 'costAsc' ? 1 : -1;
  return [...cards].sort((a, b) => sign * (a.definition.cost - b.definition.cost));
}

// One section per extension in the catalog order; sections left empty by the filter are dropped.
export function gallerySections(
  catalog: Catalog,
  cards: readonly GalleryCard[],
  filter: GalleryFilter,
): GallerySection[] {
  return [...catalog.extensions].flatMap(([slug, name]) => {
    const own = cards.filter((card) => card.definition.extension === slug);
    const shown = sortCards(
      own.filter((card) => cardMatches(card, filter)),
      filter.sort,
    );
    if (shown.length === 0) {
      return [];
    }
    const withEffect = own.filter((card) => hasEffect(card.definition)).length;
    return [{ slug, name, total: own.length, withEffect, cards: shown }];
  });
}

// Terrains have no rarity: a rarity filter hides them all; « sans effet » keeps the ones without text.
export function terrainMatches(terrain: GalleryTerrain, filter: GalleryFilter): boolean {
  if (filter.rarity !== null || (filter.noEffect && terrain.text.length > 0)) {
    return false;
  }
  if (filter.extension !== null && terrain.location.extension !== filter.extension) {
    return false;
  }
  return queryMatches(terrain.haystack, filter.query);
}
