import { describeCard, statusRule } from '@ytcg-game/engine';
import { describe, expect, it } from 'vitest';
import { effectLines, effectTier } from '../src/components/card/effectText.ts';
import { rarityGlyph, rarityKey } from '../src/components/card/rarity.ts';
import { catalog } from '../src/catalog.ts';
import { statusBadge } from '../src/components/card/statusBadge.ts';
import { holoPose } from '../src/lib/holoPose.ts';

describe('rarity', () => {
  it('maps every rarity to its glyph, a unique card being « ✦ 1/1 » whatever its base rarity', () => {
    expect(rarityGlyph(rarityKey({ rarity: 'common', unique: false }))).toBe('●');
    expect(rarityGlyph(rarityKey({ rarity: 'uncommon', unique: false }))).toBe('◆');
    expect(rarityGlyph(rarityKey({ rarity: 'rare', unique: false }))).toBe('★');
    expect(rarityGlyph(rarityKey({ rarity: 'legendary', unique: false }))).toBe('★★');
    expect(rarityKey({ rarity: 'rare', unique: true })).toBe('unique');
    expect(rarityGlyph('unique')).toBe('✦ 1/1');
  });

  it('gives every legendary and unique card a holo recipe and its ytcg mask (ytcg always draws them holo)', () => {
    const top = [...catalog.cards.values()].filter((card) => card.rarity === 'legendary' || card.unique);
    expect(top.length).toBeGreaterThan(0);
    expect(top.filter((card) => card.holo === null || card.mask === null).map((card) => card.name)).toEqual([]);
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

describe('holoPose', () => {
  it('centres the light on the middle of the card', () => {
    expect(holoPose(0.5, 0.5)).toMatchObject({
      '--pointer-x': '50.0%',
      '--pointer-from-center': '0.000',
      '--background-x': '50.0%',
      '--background-y': '50.0%',
    });
  });

  it('follows the corners the way ytcg damps them (37..63 %, 33..67 %), from-center capped at 1', () => {
    expect(holoPose(0, 0)).toMatchObject({ '--background-x': '37.0%', '--background-y': '33.0%' });
    expect(holoPose(1, 1)).toMatchObject({ '--pointer-from-left': '1.000', '--pointer-from-center': '1.000' });
  });
});

describe('statusBadge', () => {
  it('reads a pill label back to its status, stacks and crisis, with an accessible title', () => {
    expect(statusBadge('Folie · Errance', { mad: 1 })).toEqual({
      id: 'mad',
      stacks: 1,
      crisis: 'wandering',
      title: 'Folie : Errance',
    });
    expect(statusBadge('Défonce ×2', { high: 2 })).toMatchObject({
      id: 'high',
      stacks: 2,
      crisis: null,
      title: 'Défonce ×2',
    });
    expect(statusBadge('Folie', { mad: 1 })?.crisis).toBeNull();
    expect(statusBadge('Inconnu', {})).toBeNull();
  });
});
