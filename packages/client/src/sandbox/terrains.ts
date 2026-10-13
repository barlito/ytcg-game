import { type Catalog, type LocationDefinition, loadCatalog } from '@ytcg-game/engine';

export const TERRAIN_THREE = 'sandbox-three';
export const TERRAIN_CLOSED = 'sandbox-closed';
export const TERRAIN_OPENS = 'sandbox-opens';

const LOCATIONS = [
  { id: TERRAIN_THREE, name: 'Ruelle étroite', rules: { capacity: 3 } },
  { id: TERRAIN_CLOSED, name: 'Pont effondré', rules: { closedFromTurn: 4 } },
  { id: TERRAIN_OPENS, name: 'Portail tardif', rules: { openFromTurn: 5, closedFromTurn: 6 } },
];

// Dev only: the game data has no terrain with rules yet, so the sandbox adds three to the live catalog.
export function registerSandboxTerrains(catalog: Catalog): void {
  if (catalog.locations.has(TERRAIN_THREE)) {
    return;
  }
  const extra = loadCatalog({ cardFiles: [], locationFiles: [{ name: 'sandbox', content: { locations: LOCATIONS } }] });
  // The catalog map is a plain Map at runtime: the readonly type only guards the game code.
  const live = catalog.locations as Map<string, LocationDefinition>;
  for (const [id, location] of extra.locations) {
    live.set(id, location);
  }
}
