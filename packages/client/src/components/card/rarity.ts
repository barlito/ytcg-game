import type { CardDefinition } from '@ytcg-game/engine';

// The engine rarity plus « unique » (a 1/1 card), which has its own glyph and colour.
export type RarityKey = CardDefinition['rarity'] | 'unique';

const GLYPHS: Record<RarityKey, string> = {
  common: '●',
  uncommon: '◆',
  rare: '★',
  legendary: '★★',
  unique: '✦ 1/1',
};

export function rarityKey(definition: Pick<CardDefinition, 'rarity' | 'unique'>): RarityKey {
  return definition.unique ? 'unique' : definition.rarity;
}

export function rarityGlyph(key: RarityKey): string {
  return GLYPHS[key];
}

export const RARITY_LABEL: Record<RarityKey, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  legendary: 'Légendaire',
  unique: 'Unique',
};
