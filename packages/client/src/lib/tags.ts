import { type CardDefinition, type Catalog, tagLabel } from '@ytcg-game/engine';

export const TAG_GROUPS = ['universe', 'character', 'family', 'trait', 'other'] as const;

export type TagGroup = (typeof TAG_GROUPS)[number];

export interface TagChip {
  tag: string;
  label: string;
  group: TagGroup;
  // The card's own text reads this tag (« par autre carte Linette »).
  read: boolean;
}

// Tags visible before the « +N » fold.
export const TAGS_SHOWN = 6;

export function tagGroup(tag: string): TagGroup {
  const prefix = tag.split(':')[0] ?? '';
  return TAG_GROUPS.find((group) => group === prefix) ?? 'other';
}

// Every `tag` filter found anywhere in the card's abilities (condition, target, effect count): read, never re-interpreted.
export function readTags(definition: Pick<CardDefinition, 'abilities'>): Set<string> {
  const found = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (typeof node === 'object' && node !== null) {
      for (const [key, value] of Object.entries(node)) {
        if (key === 'tag' && typeof value === 'string') {
          found.add(value);
        } else {
          walk(value);
        }
      }
    }
  };
  for (const ability of definition.abilities) {
    walk(ability.params);
  }
  return found;
}

function displayLabel(catalog: Catalog, tag: string): string {
  const label = tagLabel(catalog, tag);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Chips ordered by group (universe, character, family, trait, other) then by label.
export function tagChips(catalog: Catalog, definition: CardDefinition): TagChip[] {
  const read = readTags(definition);
  return [...new Set(definition.tags)]
    .map((tag) => ({ tag, label: displayLabel(catalog, tag), group: tagGroup(tag), read: read.has(tag) }))
    .sort((a, b) => TAG_GROUPS.indexOf(a.group) - TAG_GROUPS.indexOf(b.group) || a.label.localeCompare(b.label, 'fr'));
}

// Read tags stay visible when the list folds, the rest fills the remaining room in order.
export function foldTags(chips: readonly TagChip[], limit = TAGS_SHOWN): { shown: TagChip[]; hidden: TagChip[] } {
  if (chips.length <= limit) {
    return { shown: [...chips], hidden: [] };
  }
  const keep = new Set(chips.filter((chip) => chip.read).map((chip) => chip.tag));
  for (const chip of chips) {
    if (keep.size >= limit) {
      break;
    }
    keep.add(chip.tag);
  }
  return {
    shown: chips.filter((chip) => keep.has(chip.tag)),
    hidden: chips.filter((chip) => !keep.has(chip.tag)),
  };
}
