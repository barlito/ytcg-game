import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Catalog, loadCatalog } from '../catalog.ts';

export const DATA_DIR = fileURLToPath(new URL('../../../../data/', import.meta.url));

function readJsonFiles(dir: string): { name: string; content: unknown }[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => ({ name: file, content: JSON.parse(readFileSync(join(dir, file), 'utf8')) as unknown }));
}

// Node-only loader for tooling and tests: the engine itself never touches the filesystem.
export function loadDataDir(dir: string = DATA_DIR): Catalog {
  return loadCatalog({
    cardFiles: readJsonFiles(join(dir, 'cards')),
    locationFiles: readJsonFiles(join(dir, 'locations')),
  });
}
