// Seeds data/cards/<universe>.json from the YoulzAssets manifests (cards already in prod only).
// Re-running it never touches the game values of a known card (cost, power, tags, abilities).
// Terrains (data/locations/*.json) are never re-added as playable cards.
// Optional ytcg prod dump: fills/refreshes the `image` of cards and terrains, matched by uuid.
// Inputs are trusted local files (manifests, dump, data/): their shape is cast, not validated.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

interface ManifestCard {
  name: string;
  rarity: Rarity;
  unique?: boolean;
  prodId?: string;
}

type ProdCard = ManifestCard & { prodId: string };

interface Manifest {
  extension: { name: string; slug?: string; status?: string };
  cards: ManifestCard[];
}

interface GameCard {
  id: string;
  name: string;
  rarity: Rarity;
  unique: boolean;
  image?: string;
  mask?: string;
  holo?: string;
  cost: number;
  power: number;
  tags: string[];
  abilities: unknown[];
}

interface CardFile {
  extension: { slug: string; name: string };
  cards: GameCard[];
}

interface LocationFile {
  locations: { id: string; image?: string }[];
}

// Production dump of ytcg: { "<slug>": { "cards": [{ "id", "imageName", "imageMaskName", "alwaysHolo" }] } }.
interface DumpCard {
  id: string;
  imageName?: string | null;
  imageMaskName?: string | null;
  alwaysHolo?: boolean;
}
type ProdDump = Record<string, { cards: DumpCard[] }>;

const COST_RANGE: Record<Rarity, number[]> = { common: [1, 2], uncommon: [2, 3], rare: [3, 4], legendary: [5, 6] };
const VANILLA_POWER = [1, 2, 3, 4, 6, 9, 12];

const CHARACTERS: [RegExp, string][] = [
  [/\bbarlito\b/, 'barlito'],
  [/\b(benj|benjamen|jben)\b/, 'benj'],
  [/\b(farf|farph|pharph)\b/, 'farf'],
  [/\b(veli|velo)\b/, 'veli'],
  [/\b(julian|julien|julieng)\b/, 'julian'],
  [/\b(warnyx?|weebou)\b/, 'warny'],
  [/\bbernard\b/, 'bernard'],
  [/\bnairy\b/, 'nairy'],
  [/\bjean\b.*\braoulz?\b/, 'jean-raoul'],
  [/\bbabou\b/, 'babou-linette'],
  [/\bbibou\b/, 'bibou-linette'],
  [/\bbebou\b/, 'bebou-linette'],
  [/\bfrieda\b/, 'frieda-linette'],
  [/\bahri\b/, 'ahri'],
  [/\bakali\b/, 'akali'],
  [/\bevelynn\b/, 'evelynn'],
  [/\bkai'?sa\b/, 'kaisa'],
  [/\bzocnoth\b/, 'zocnoth'],
  [/\bxizta\b/, 'xizta'],
  [/\bahlototh\b/, 'ahlototh'],
];

function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

function baselineCost(card: ProdCard): number {
  if (card.unique === true) {
    return 6;
  }
  const range = COST_RANGE[card.rarity];
  return range[hash(card.prodId) % range.length] ?? 1;
}

function guessTags(name: string): string[] {
  const normalized = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  const tags = CHARACTERS.filter(([pattern]) => pattern.test(normalized)).map(
    ([, character]) => `character:${character}`,
  );
  if (/\blinette\b/.test(normalized)) {
    tags.push('family:linette');
  }
  return tags;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, content: unknown): void {
  writeFileSync(path, `${JSON.stringify(content, null, 2)}\n`);
}

function readDump(dumpPath: string | undefined): DumpCard[] {
  return dumpPath === undefined ? [] : Object.values(readJson(dumpPath) as ProdDump).flatMap(({ cards }) => cards);
}

function readImages(dump: DumpCard[]): Map<string, string> {
  const images = new Map<string, string>();
  for (const card of dump) {
    if (typeof card.imageName === 'string' && card.imageName !== '') {
      images.set(card.id, card.imageName);
    }
  }
  return images;
}

// The holo look of a card: its ytcg mask and, when ytcg always draws it holo, a preset (basic = ytcg's own fallback).
function readHolo(dump: DumpCard[]): Map<string, { mask?: string; holo?: string }> {
  const looks = new Map<string, { mask?: string; holo?: string }>();
  for (const card of dump) {
    const mask = typeof card.imageMaskName === 'string' && card.imageMaskName !== '' ? card.imageMaskName : undefined;
    looks.set(card.id, {
      ...(mask === undefined ? {} : { mask }),
      ...(card.alwaysHolo === true ? { holo: 'basic' } : {}),
    });
  }
  return looks;
}

// Unknown to the dump (or no dump given): the current image stays.
function withImage<T extends { id: string; image?: string }>(entry: T, images: Map<string, string>): T {
  const image = images.get(entry.id);
  return image === undefined ? entry : { ...entry, image };
}

// The mask is refreshed; a hand-picked preset is never overwritten by the default one.
function withHolo(card: GameCard, looks: Map<string, { mask?: string; holo?: string }>): GameCard {
  const look = looks.get(card.id);
  return look === undefined ? card : { ...card, ...look, ...(card.holo === undefined ? {} : { holo: card.holo }) };
}

// Returns every terrain id, after refreshing their images.
function refreshTerrains(locationsDir: string, images: Map<string, string>): Set<string> {
  const ids = new Set<string>();
  if (!existsSync(locationsDir)) {
    return ids;
  }
  for (const file of readdirSync(locationsDir).filter((name) => name.endsWith('.json'))) {
    const path = join(locationsDir, file);
    const content = readJson(path) as LocationFile;
    content.locations = content.locations.map((location) => withImage(location, images));
    content.locations.forEach((location) => ids.add(location.id));
    if (images.size > 0) {
      writeJson(path, content);
    }
  }
  return ids;
}

function newCard(card: ProdCard, image: string | undefined): GameCard {
  const cost = baselineCost(card);
  return {
    id: card.prodId,
    name: card.name,
    rarity: card.rarity,
    unique: card.unique === true,
    ...(image === undefined ? {} : { image }),
    cost,
    power: VANILLA_POWER[cost] ?? cost * 2,
    tags: guessTags(card.name),
    abilities: [],
  };
}

interface ImportContext {
  outDir: string;
  terrains: ReadonlySet<string>;
  images: Map<string, string>;
  looks: Map<string, { mask?: string; holo?: string }>;
}

function importManifest(manifest: Manifest, context: ImportContext): void {
  const slug = manifest.extension.slug;
  if (manifest.extension.status === 'rejected' || slug === undefined) {
    return;
  }
  const outPath = join(context.outDir, `${slug}.json`);
  const existing = existsSync(outPath) ? (readJson(outPath) as CardFile) : null;
  const known = new Map((existing?.cards ?? []).map((card) => [card.id, card]));
  let added = 0;

  const cards = manifest.cards
    .filter((card): card is ProdCard => typeof card.prodId === 'string' && !context.terrains.has(card.prodId))
    .map((card): GameCard => {
      const previous = known.get(card.prodId);
      known.delete(card.prodId);
      if (previous === undefined) {
        added++;
        return withHolo(newCard(card, context.images.get(card.prodId)), context.looks);
      }
      const updated = { ...previous, name: card.name, rarity: card.rarity, unique: card.unique === true };
      return withHolo(withImage(updated, context.images), context.looks);
    });

  const orphans = [...known.values()].filter((card) => !context.terrains.has(card.id));
  cards.push(...orphans.map((card) => withHolo(withImage(card, context.images), context.looks)));
  for (const orphan of orphans) {
    console.warn(`  ! ${slug}: ${orphan.name} (${orphan.id}) is no longer in the manifest, kept as is`);
  }

  writeJson(outPath, { extension: { slug, name: manifest.extension.name }, cards } satisfies CardFile);
  console.log(`${slug}: ${cards.length} cards (${added} new)`);
}

const [assetsDir, outDir = 'data/cards', dumpPath] = process.argv.slice(2);
if (assetsDir === undefined) {
  console.error('Usage: node tools/import-youlz-assets.ts <YoulzAssets dir> [cards dir] [ytcg prod dump]');
  process.exit(1);
}

const dump = readDump(dumpPath);
const images = readImages(dump);
const context: ImportContext = {
  outDir,
  images,
  looks: readHolo(dump),
  terrains: refreshTerrains(join(outDir, '..', 'locations'), images),
};
const ytcgDir = join(assetsDir, 'YTCG');
for (const folder of readdirSync(ytcgDir).sort()) {
  const manifestPath = join(ytcgDir, folder, 'manifest.json');
  if (existsSync(manifestPath)) {
    importManifest(readJson(manifestPath) as Manifest, context);
  }
}
