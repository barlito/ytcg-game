import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const IMPORTER = fileURLToPath(new URL('../../../tools/import-youlz-assets.ts', import.meta.url));

function writeJson(path: string, content: unknown): void {
  writeFileSync(path, JSON.stringify(content));
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// A YoulzAssets folder with one manifest, a cards dir with one tuned card and a locations dir with one terrain.
function workspace(): { root: string; cards: string; locations: string; dump: string } {
  const root = mkdtempSync(join(tmpdir(), 'import-assets-'));
  const dir = (path: string): string => {
    mkdirSync(join(root, path), { recursive: true });
    return join(root, path);
  };
  const assets = dir('assets/YTCG/Test');
  const cards = dir('data/cards');
  const locations = dir('data/locations');
  writeJson(join(assets, 'manifest.json'), {
    extension: { name: 'Test', slug: 'test' },
    cards: [
      { name: 'Tuned renamed', rarity: 'rare', prodId: 'tuned' },
      { name: 'Fresh', rarity: 'common', prodId: 'fresh' },
      { name: 'A place', rarity: 'common', prodId: 'place' },
    ],
  });
  const tuned = { id: 'tuned', name: 'Tuned', rarity: 'common', unique: false, cost: 5, power: 1, tags: ['trait:x'] };
  writeJson(join(cards, 'test.json'), {
    extension: { slug: 'test', name: 'Test' },
    cards: [{ ...tuned, abilities: [] }],
  });
  writeJson(join(locations, 'test.json'), { locations: [{ id: 'place', name: 'A place', abilities: [] }] });
  const dump = join(root, 'prod-cards.json');
  writeJson(dump, {
    test: { cards: ['tuned', 'fresh', 'place'].map((id) => ({ id, imageName: `${id}-6a76.png` })) },
  });
  return { root, cards, locations, dump };
}

describe('tools/import-youlz-assets.ts', () => {
  it('never re-adds a terrain, keeps tuned values and fills the artwork from the prod dump', () => {
    const { root, cards, locations, dump } = workspace();
    execFileSync(process.execPath, [IMPORTER, join(root, 'assets'), cards, dump], { stdio: 'pipe' });

    expect(readJson(join(cards, 'test.json'))).toEqual({
      extension: { slug: 'test', name: 'Test' },
      cards: [
        expect.objectContaining({
          id: 'tuned',
          name: 'Tuned renamed',
          rarity: 'rare',
          cost: 5,
          power: 1,
          tags: ['trait:x'],
          image: 'tuned-6a76.png',
        }),
        expect.objectContaining({ id: 'fresh', name: 'Fresh', image: 'fresh-6a76.png' }),
      ],
    });
    expect(readJson(join(locations, 'test.json'))).toEqual({
      locations: [{ id: 'place', name: 'A place', abilities: [], image: 'place-6a76.png' }],
    });
  });

  it('keeps the current artwork without a dump', () => {
    const { root, cards, dump } = workspace();
    execFileSync(process.execPath, [IMPORTER, join(root, 'assets'), cards, dump], { stdio: 'pipe' });
    execFileSync(process.execPath, [IMPORTER, join(root, 'assets'), cards], { stdio: 'pipe' });
    expect(JSON.stringify(readJson(join(cards, 'test.json')))).toContain('"image":"fresh-6a76.png"');
  });
});
