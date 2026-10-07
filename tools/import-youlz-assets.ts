// Seeds data/cards/<universe>.json from the YoulzAssets manifests (cards already in prod only).
// Re-running it never touches the game values of a known card (cost, power, tags, abilities).
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

interface ManifestCard {
  name: string;
  rarity: Rarity;
  unique?: boolean;
  prodId?: string;
}

interface Manifest {
  extension: { name: string; slug?: string; status?: string };
  cards: ManifestCard[];
}

interface GameCard {
  id: string;
  name: string;
  rarity: Rarity;
  unique: boolean;
  cost: number;
  power: number;
  tags: string[];
  abilities: unknown[];
}

interface CardFile {
  extension: { slug: string; name: string };
  cards: GameCard[];
}

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

function baselineCost(card: ManifestCard & { prodId: string }): number {
  if (card.unique === true) {
    return 6;
  }
  const range = COST_RANGE[card.rarity];
  return range[hash(card.prodId) % range.length] ?? 1;
}

function guessTags(name: string): string[] {
  const normalized = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const tags = CHARACTERS.filter(([pattern]) => pattern.test(normalized)).map(([, character]) => `character:${character}`);
  if (/\blinette\b/.test(normalized)) {
    tags.push('family:linette');
  }
  return tags;
}

const [assetsDir, outDir = 'data/cards'] = process.argv.slice(2);
if (assetsDir === undefined) {
  console.error('Usage: node tools/import-youlz-assets.ts <YoulzAssets dir> [out dir]');
  process.exit(1);
}

const ytcgDir = join(assetsDir, 'YTCG');
for (const folder of readdirSync(ytcgDir).sort()) {
  const manifestPath = join(ytcgDir, folder, 'manifest.json');
  if (!existsSync(manifestPath)) {
    continue;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const slug = manifest.extension.slug;
  if (manifest.extension.status === 'rejected' || slug === undefined) {
    continue;
  }

  const outPath = join(outDir, `${slug}.json`);
  const existing = existsSync(outPath) ? (JSON.parse(readFileSync(outPath, 'utf8')) as CardFile) : null;
  const known = new Map((existing?.cards ?? []).map((card) => [card.id, card]));
  const seen = new Set<string>();
  let added = 0;

  const cards = manifest.cards
    .filter((card): card is ManifestCard & { prodId: string } => typeof card.prodId === 'string')
    .map((card): GameCard => {
      seen.add(card.prodId);
      const previous = known.get(card.prodId);
      if (previous !== undefined) {
        return { ...previous, name: card.name, rarity: card.rarity, unique: card.unique === true };
      }
      added++;
      const cost = baselineCost(card);
      return {
        id: card.prodId,
        name: card.name,
        rarity: card.rarity,
        unique: card.unique === true,
        cost,
        power: VANILLA_POWER[cost] ?? cost * 2,
        tags: guessTags(card.name),
        abilities: [],
      };
    });

  const orphans = [...known.values()].filter((card) => !seen.has(card.id));
  cards.push(...orphans);
  for (const orphan of orphans) {
    console.warn(`  ! ${slug}: ${orphan.name} (${orphan.id}) is no longer in the manifest, kept as is`);
  }

  const file: CardFile = { extension: { slug, name: manifest.extension.name }, cards };
  writeFileSync(outPath, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`${slug}: ${cards.length} cards (${added} new)`);
}
