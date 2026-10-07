import { z } from 'zod';
import { type CompiledAbility, abilitySchema, compileAbility, locationAbilityIssues } from './abilities/ability.ts';
import { tagSchema } from './abilities/board.ts';
import { CatalogError } from './errors.ts';

export const RARITIES = ['common', 'uncommon', 'rare', 'legendary'] as const;

export type Rarity = (typeof RARITIES)[number];

const slugSchema = z.string().regex(/^[a-z0-9-]+$/);

const cardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rarity: z.enum(RARITIES),
  unique: z.boolean().default(false),
  cost: z.number().int().min(0).max(10),
  power: z.number().int(),
  tags: z.array(tagSchema).default([]),
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
  readonly cost: number;
  readonly power: number;
  readonly tags: readonly string[];
  readonly abilities: readonly CompiledAbility[];
}

export interface LocationDefinition {
  readonly id: string;
  readonly name: string;
  readonly extension: string | null;
  readonly abilities: readonly CompiledAbility[];
}

export class Catalog {
  readonly cards: ReadonlyMap<string, CardDefinition>;
  readonly locations: ReadonlyMap<string, LocationDefinition>;

  constructor(cards: ReadonlyMap<string, CardDefinition>, locations: ReadonlyMap<string, LocationDefinition>) {
    this.cards = cards;
    this.locations = locations;
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

// Every card gets the "universe:<slug>" tag of its file, so the data never repeats it.
export function loadCatalog(source: CatalogSource): Catalog {
  const issues: string[] = [];
  const cards = new Map<string, CardDefinition>();
  const locations = new Map<string, LocationDefinition>();

  for (const file of source.cardFiles) {
    const parsed = cardFileSchema.safeParse(file.content);
    if (!parsed.success) {
      issues.push(`${file.name}: ${z.prettifyError(parsed.error)}`);
      continue;
    }
    const { extension } = parsed.data;
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
        cost: card.cost,
        power: card.power,
        tags: [...new Set([`universe:${extension.slug}`, ...card.tags])],
        abilities: card.abilities.map(compileAbility),
      });
    }
  }

  for (const file of source.locationFiles) {
    const parsed = locationFileSchema.safeParse(file.content);
    if (!parsed.success) {
      issues.push(`${file.name}: ${z.prettifyError(parsed.error)}`);
      continue;
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

  if (issues.length > 0) {
    throw new CatalogError(issues);
  }

  return new Catalog(cards, locations);
}
