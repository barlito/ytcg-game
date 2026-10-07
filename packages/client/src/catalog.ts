import { type Catalog, Rng, buildRandomDeck, loadCatalog } from '@ytcg-game/engine';

// Same data files as the server: bundled at build time.
const cardFiles = import.meta.glob<unknown>('../../../data/cards/*.json', { eager: true, import: 'default' });
const locationFiles = import.meta.glob<unknown>('../../../data/locations/*.json', { eager: true, import: 'default' });

function toSource(files: Record<string, unknown>): { name: string; content: unknown }[] {
  return Object.entries(files).map(([name, content]) => ({ name, content }));
}

export const catalog: Catalog = loadCatalog({ cardFiles: toSource(cardFiles), locationFiles: toSource(locationFiles) });

// Until decks come from ytcg: a random deck respecting the curve.
export function randomDeck(): string[] {
  const deck = buildRandomDeck(catalog, new Rng({ s: Math.floor(Math.random() * 2 ** 32) }));
  if (deck === null) {
    throw new Error('the catalog cannot build a legal deck');
  }
  return deck;
}

export function randomLocation(): string {
  const ids = [...catalog.locations.keys()];
  return ids[Math.floor(Math.random() * ids.length)] ?? '';
}
