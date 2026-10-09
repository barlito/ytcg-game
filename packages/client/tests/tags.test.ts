import { describe, expect, it } from 'vitest';
import { catalog } from '../src/catalog.ts';
import { type TagChip, foldTags, readTags, tagChips, tagGroup } from '../src/lib/tags.ts';

const cards = [...catalog.cards.values()];

describe('tags', () => {
  it('groups by prefix and sends unknown prefixes to other', () => {
    expect(tagGroup('family:linette')).toBe('family');
    expect(tagGroup('mood:calm')).toBe('other');
  });

  it('labels in French and orders by group', () => {
    const babou = cards.find((card) => card.tags.includes('trait:machine') && card.tags.includes('family:linette'));
    if (babou === undefined) {
      throw new Error('no Linette machine in the catalog');
    }
    const chips = tagChips(catalog, babou);
    expect(chips.map((chip) => chip.group)).toEqual(['universe', 'character', 'family', 'trait']);
    expect(chips.map((chip) => chip.label)).toContain('Machine');
    expect(chips.find((chip) => chip.group === 'universe')?.label).toBe(catalog.extensions.get(babou.extension));
  });

  it('flags the tags the abilities read, whatever the filter location', () => {
    const reading = cards.filter((card) => readTags(card).size > 0);
    expect(reading.length).toBeGreaterThan(0);
    for (const card of reading) {
      for (const tag of readTags(card)) {
        expect(tag).toMatch(/^[a-z]+:[a-z0-9-]+$/);
      }
    }
    const synthetic = { abilities: [{ params: { condition: { tag: 'a:b' }, effect: [{ count: { tag: 'c:d' } }] } }] };
    expect([...readTags(synthetic as never)].sort()).toEqual(['a:b', 'c:d']);
  });

  it('folds past the limit but keeps read tags visible', () => {
    const chip = (tag: string, read: boolean): TagChip => ({ tag, label: tag, group: 'other', read });
    const chips = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((tag) => chip(tag, tag === 'h'));
    const { shown, hidden } = foldTags(chips, 6);
    expect(shown).toHaveLength(6);
    expect(shown.map((c) => c.tag)).toContain('h');
    expect(hidden).toHaveLength(2);
    expect(foldTags(chips.slice(0, 4), 6).hidden).toEqual([]);
  });
});
