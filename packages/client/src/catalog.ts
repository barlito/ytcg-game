import { type Catalog, DECK_SIZE, loadCatalog } from '@ytcg-game/engine';

// Same data files as the server: bundled at build time.
const cardFiles = import.meta.glob<unknown>('../../../data/cards/*.json', { eager: true, import: 'default' });
const locationFiles = import.meta.glob<unknown>('../../../data/locations/*.json', { eager: true, import: 'default' });

function toSource(files: Record<string, unknown>): { name: string; content: unknown }[] {
  return Object.entries(files).map(([name, content]) => ({ name, content }));
}

export const catalog: Catalog = loadCatalog({ cardFiles: toSource(cardFiles), locationFiles: toSource(locationFiles) });

// Until decks come from ytcg: 12 distinct cards picked at random.
export function randomDeck(): string[] {
  const ids = [...catalog.cards.keys()];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j] ?? '', ids[i] ?? ''];
  }
  return ids.slice(0, DECK_SIZE);
}
