import { z } from 'zod';
import { type CompiledAbility, abilitySchema, compileAbility, locationAbilityIssues } from './abilities/ability.ts';
import { tagSchema } from './abilities/board.ts';
import { type StatusId, statusSchema } from './abilities/statuses.ts';
import { CatalogError } from './errors.ts';

export const RARITIES = ['common', 'uncommon', 'rare', 'legendary'] as const;

export type Rarity = (typeof RARITIES)[number];

const slugSchema = z.string().regex(/^[a-z0-9-]+$/);

// File name of the ytcg artwork, served by ytcg under /uploads/cards/.
const imageSchema = z
  .string()
  .regex(/^[\w.-]+$/)
  .nullable()
  .default(null);

const cardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rarity: z.enum(RARITIES),
  unique: z.boolean().default(false),
  image: imageSchema,
  cost: z.number().int().min(0).max(10),
  power: z.number().int(),
  tags: z.array(tagSchema).default([]),
  // Statuses the card carries from the moment it is revealed.
  statuses: z.array(statusSchema).default([]),
  abilities: z.array(abilitySchema).default([]),
});

export const cardFileSchema = z.object({
  extension: z.object({ slug: slugSchema, name: z.string().min(1) }),
  cards: z.array(cardSchema),
});

export type CardFile = z.input<typeof cardFileSchema>;

const locationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  extension: slugSchema.nullable().default(null),
  image: imageSchema,
  abilities: z.array(abilitySchema).default([]),
});

export const locationFileSchema = z.object({ locations: z.array(locationSchema) });

export type LocationFile = z.input<typeof locationFileSchema>;

export interface CardDefinition {
  readonly id: string;
  readonly name: string;
  readonly extension: string;
  readonly rarity: Rarity;
  readonly unique: boolean;
  readonly image: string | null;
  readonly cost: number;
  readonly power: number;
  readonly tags: readonly string[];
  readonly statuses: readonly StatusId[];
  readonly abilities: readonly CompiledAbility[];
}

export interface LocationDefinition {
  readonly id: string;
  readonly name: string;
  readonly extension: string | null;
  readonly image: string | null;
  readonly abilities: readonly CompiledAbility[];
}

export class Catalog {
  readonly cards: ReadonlyMap<string, CardDefinition>;
  readonly locations: ReadonlyMap<string, LocationDefinition>;
  // Universe slug → display name.
  readonly extensions: ReadonlyMap<string, string>;

  constructor(
    cards: ReadonlyMap<string, CardDefinition>,
    locations: ReadonlyMap<string, LocationDefinition>,
    extensions: ReadonlyMap<string, string>,
  ) {
    this.cards = cards;
    this.locations = locations;
    this.extensions = extensions;
  }

  card(id: string): CardDefinition {
    const card = this.cards.get(id);
    if (card === undefined) {
      throw new RangeError(`Unknown card "${id}"`);
    }
    return card;
  }

  location(id: string): LocationDefinition {
    const location = this.locations.get(id);
    if (location === undefined) {
      throw new RangeError(`Unknown location "${id}"`);
    }
    return location;
  }
}

export interface CatalogSource {
  cardFiles: readonly { name: string; content: unknown }[];
  locationFiles: readonly { name: string; content: unknown }[];
}

type DataFile = CatalogSource['cardFiles'][number];

// Collects every issue of every file, so one run lists everything to fix.
export function loadCatalog(source: CatalogSource): Catalog {
  const issues: string[] = [];
  const cards = new Map<string, CardDefinition>();
  const locations = new Map<string, LocationDefinition>();
  const extensions = new Map<string, string>();
  for (const file of source.cardFiles) {
    loadCardFile(file, cards, extensions, issues);
  }
  for (const file of source.locationFiles) {
    loadLocationFile(file, locations, issues);
  }
  // A terrain shares its ytcg uuid with no playable card: a place is only ever a terrain.
  for (const id of locations.keys()) {
    if (cards.has(id)) {
      issues.push(`${id} is both a card and a location`);
    }
  }
  if (issues.length > 0) {
    throw new CatalogError(issues);
  }
  return new Catalog(cards, locations, extensions);
}

// Every card gets the "universe:<slug>" tag of its file, so the data never repeats it.
function loadCardFile(
  file: DataFile,
  cards: Map<string, CardDefinition>,
  extensions: Map<string, string>,
  issues: string[],
): void {
  const parsed = cardFileSchema.safeParse(file.content);
  if (!parsed.success) {
    issues.push(`${file.name}: ${z.prettifyError(parsed.error)}`);
    return;
  }
  const { extension } = parsed.data;
  extensions.set(extension.slug, extension.name);
  for (const card of parsed.data.cards) {
    if (cards.has(card.id)) {
      issues.push(`${file.name}: duplicate card id ${card.id}`);
      continue;
    }
    cards.set(card.id, {
      id: card.id,
      name: card.name,
      extension: extension.slug,
      rarity: card.rarity,
      unique: card.unique,
      image: card.image,
      cost: card.cost,
      power: card.power,
      tags: [...new Set([`universe:${extension.slug}`, ...card.tags])],
      statuses: [...new Set(card.statuses)],
      abilities: card.abilities.map(compileAbility),
    });
  }
}

function loadLocationFile(file: DataFile, locations: Map<string, LocationDefinition>, issues: string[]): void {
  const parsed = locationFileSchema.safeParse(file.content);
  if (!parsed.success) {
    issues.push(`${file.name}: ${z.prettifyError(parsed.error)}`);
    return;
  }
  for (const location of parsed.data.locations) {
    if (locations.has(location.id)) {
      issues.push(`${file.name}: duplicate location id ${location.id}`);
      continue;
    }
    const abilityIssues = location.abilities.flatMap(locationAbilityIssues);
    if (abilityIssues.length > 0) {
      issues.push(...abilityIssues.map((issue) => `${file.name}: location ${location.id}: ${issue}`));
      continue;
    }
    locations.set(location.id, { ...location, abilities: location.abilities.map(compileAbility) });
  }
}
