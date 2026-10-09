import { describeCard, statusRule } from '@ytcg-game/engine';
import { describe, expect, it } from 'vitest';
import { effectLines, effectTier } from '../src/components/card/effectText.ts';
import { hasSheen, rarityGlyph, rarityKey } from '../src/components/card/rarity.ts';
import { catalog } from '../src/catalog.ts';

describe('rarity', () => {
  it('maps every rarity to its glyph, a unique card being « ✦ 1/1 » whatever its base rarity', () => {
    expect(rarityGlyph(rarityKey({ rarity: 'common', unique: false }))).toBe('●');
    expect(rarityGlyph(rarityKey({ rarity: 'uncommon', unique: false }))).toBe('◆');
    expect(rarityGlyph(rarityKey({ rarity: 'rare', unique: false }))).toBe('★');
    expect(rarityGlyph(rarityKey({ rarity: 'legendary', unique: false }))).toBe('★★');
    expect(rarityKey({ rarity: 'rare', unique: true })).toBe('unique');
    expect(rarityGlyph('unique')).toBe('✦ 1/1');
  });

  it('only sweeps legendary and unique cards with the holo reflection', () => {
    expect(['common', 'uncommon', 'rare', 'legendary', 'unique'].filter((key) => hasSheen(key as never))).toEqual([
      'legendary',
      'unique',
    ]);
  });
});

describe('effectLines', () => {
  it('splits the status keywords from the ability lines', () => {
    const lines = ['Coriace (ne peut être ni détruite ni affaiblie).', 'Folie.', 'À la révélation : gagne 1.'];
    expect(effectLines(lines, ['Coriace', 'Folie'])).toEqual([
      { keyword: 'Coriace', text: ' (ne peut être ni détruite ni affaiblie).' },
      { keyword: 'Folie.', text: '' },
      { keyword: '', text: 'À la révélation : gagne 1.' },
    ]);
  });

  it('follows what the engine prints for every catalog card with statuses', () => {
    for (const definition of catalog.cards.values()) {
      const names = definition.statuses.map((status) => statusRule(status).name);
      const parsed = effectLines(describeCard(catalog, definition), names);
      expect(parsed.filter((line) => line.keyword !== '').length).toBe(names.length);
    }
  });
});

describe('effectTier', () => {
  it('steps the type down as the effect text gets longer', () => {
    expect(effectTier(['Folie.'])).toBe(1);
    expect(effectTier(['x'.repeat(90)])).toBe(1);
    expect(effectTier(['x'.repeat(45), 'y'.repeat(45)])).toBe(2);
    expect(effectTier(['x'.repeat(131)])).toBe(3);
  });

  it('keeps every catalog card in a tier', () => {
    for (const definition of catalog.cards.values()) {
      expect([1, 2, 3]).toContain(effectTier(describeCard(catalog, definition)));
    }
  });
});
