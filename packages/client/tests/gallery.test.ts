import { describe, expect, it } from 'vitest';
import { catalog } from '../src/catalog.ts';
import {
  DEFAULT_FILTER,
  type GalleryFilter,
  cardMatches,
  galleryCards,
  gallerySections,
  galleryTerrains,
  hasEffect,
  normalize,
  sortCards,
  terrainMatches,
} from '../src/gallery/gallery.ts';

const cards = galleryCards(catalog);
const terrains = galleryTerrains(catalog);

function sections(patch: Partial<GalleryFilter>): ReturnType<typeof gallerySections> {
  return gallerySections(catalog, cards, { ...DEFAULT_FILTER, ...patch });
}

function firstCard(): (typeof cards)[number] {
  const [card] = cards;
  if (card === undefined) {
    throw new Error('empty catalog');
  }
  return card;
}

describe('card gallery', () => {
  it('lists every card once, grouped by extension in the data order', () => {
    const all = sections({});
    expect(all.map((section) => section.slug)).toEqual([...catalog.extensions.keys()]);
    expect(all.flatMap((section) => section.cards)).toHaveLength(catalog.cards.size);
    for (const section of all) {
      expect(section.total).toBe(section.cards.length);
      expect(section.withEffect).toBe(section.cards.filter((card) => hasEffect(card.definition)).length);
    }
  });

  it('folds case, accents and apostrophes in the search', () => {
    expect(normalize('  Élu D’ARGENT ')).toBe("elu d'argent");
    const card = firstCard();
    const query = normalize(card.definition.name).toUpperCase();
    expect(cardMatches(card, { ...DEFAULT_FILTER, query })).toBe(true);
    expect(cardMatches(card, { ...DEFAULT_FILTER, query: 'zzz-introuvable' })).toBe(false);
  });

  it('searches the generated effect text, every word anywhere', () => {
    const shown = sections({ query: 'révélation puissance' }).flatMap((section) => section.cards);
    expect(shown.length).toBeGreaterThan(0);
    for (const card of shown) {
      expect(card.haystack).toContain('revelation');
      expect(card.haystack).toContain('puissance');
    }
  });

  it('filters by extension and rarity, keeping the extension counts', () => {
    const card = firstCard();
    const { extension } = card.definition;
    const only = sections({ extension, rarity: 'common' });
    expect(only.length).toBeLessThanOrEqual(1);
    for (const section of only) {
      expect(section.slug).toBe(extension);
      expect(section.total).toBe(cards.filter((c) => c.definition.extension === extension).length);
      expect(section.cards.every((c) => c.definition.rarity === 'common' && !c.definition.unique)).toBe(true);
    }
  });

  it('shows only the cards without abilities with « sans effet »', () => {
    const shown = sections({ noEffect: true }).flatMap((section) => section.cards);
    expect(shown.every((card) => card.definition.abilities.length === 0)).toBe(true);
    expect(shown).toHaveLength(cards.filter((card) => !hasEffect(card.definition)).length);
  });

  it('sorts by cost both ways and keeps the data order on ties', () => {
    const up = sortCards(cards, 'costAsc').map((card) => card.definition.cost);
    expect(up).toEqual([...up].sort((a, b) => a - b));
    const down = sortCards(cards, 'costDesc').map((card) => card.definition.cost);
    expect(down).toEqual([...down].sort((a, b) => b - a));
    expect(sortCards(cards, 'catalog')).toEqual(cards);
    const cheapest = Math.min(...up);
    const ties = cards.filter((card) => card.definition.cost === cheapest);
    expect(sortCards(cards, 'costAsc').slice(0, ties.length)).toEqual(ties);
  });

  it('lists the terrains with their text, hidden by a rarity filter', () => {
    expect(terrains).toHaveLength(catalog.locations.size);
    expect(terrains.every((terrain) => terrainMatches(terrain, DEFAULT_FILTER))).toBe(true);
    expect(terrains.some((terrain) => terrainMatches(terrain, { ...DEFAULT_FILTER, rarity: 'rare' }))).toBe(false);
    const [terrain] = terrains;
    if (terrain !== undefined) {
      expect(terrainMatches(terrain, { ...DEFAULT_FILTER, query: terrain.location.name })).toBe(true);
      expect(terrainMatches(terrain, { ...DEFAULT_FILTER, extension: 'zzz' })).toBe(false);
    }
  });
});
