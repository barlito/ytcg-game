import { type CardDefinition, type Catalog, type LocationDefinition, tagLabel } from '@ytcg-game/engine';
import type { OwnedCard } from '../ytcg/schemas.ts';

export interface PoolCard {
  definition: CardDefinition;
  quantity: number;
  holo: number;
}

export interface Pool {
  // Owned cards the game knows, by cost then name.
  cards: PoolCard[];
  terrains: LocationDefinition[];
}

export function buildPool(catalog: Catalog, collection: readonly OwnedCard[]): Pool {
  const cards = collection.flatMap((owned) => {
    const definition = owned.terrain ? undefined : catalog.cards.get(owned.id);
    return definition === undefined ? [] : [{ definition, quantity: owned.quantity, holo: owned.holoQuantity }];
  });
  cards.sort((a, b) => a.definition.cost - b.definition.cost || a.definition.name.localeCompare(b.definition.name));
  const terrains = collection.flatMap((owned) => {
    const terrain = catalog.locations.get(owned.id);
    return terrain === undefined ? [] : [terrain];
  });
  return { cards, terrains };
}

export interface PoolFilter {
  universe: string | null;
  // COST_MAX means « COST_MAX or more ».
  cost: number | null;
  tag: string | null;
}

export const COST_MAX = 6;
export const NO_FILTER: PoolFilter = { universe: null, cost: null, tag: null };

function matches(card: CardDefinition, filter: PoolFilter): boolean {
  const cost = Math.min(card.cost, COST_MAX);
  return (
    (filter.universe === null || card.extension === filter.universe) &&
    (filter.cost === null || cost === filter.cost) &&
    (filter.tag === null || card.tags.includes(filter.tag))
  );
}

export function filterPool(cards: readonly PoolCard[], filter: PoolFilter): PoolCard[] {
  return cards.filter((card) => matches(card.definition, filter));
}

export interface FilterOption<T> {
  value: T;
  label: string;
}

export interface FilterOptions {
  universes: FilterOption<string>[];
  costs: FilterOption<number>[];
  tags: FilterOption<string>[];
}

// Only values present among the owned cards (the universe tag is the universe filter).
export function filterOptions(catalog: Catalog, cards: readonly PoolCard[]): FilterOptions {
  const universes = [...new Set(cards.map((card) => card.definition.extension))].sort();
  const costs = [...new Set(cards.map((card) => Math.min(card.definition.cost, COST_MAX)))].sort((a, b) => a - b);
  const tags = [...new Set(cards.flatMap((card) => card.definition.tags))].filter(
    (tag) => !tag.startsWith('universe:'),
  );
  return {
    universes: universes.map((slug) => ({ value: slug, label: catalog.extensions.get(slug) ?? slug })),
    costs: costs.map((cost) => ({ value: cost, label: cost === COST_MAX ? `${cost}+` : String(cost) })),
    tags: tags
      .map((tag) => ({ value: tag, label: tagLabel(catalog, tag) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}
