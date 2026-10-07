import { describe, expect, it } from 'vitest';
import { CatalogError, DECK_SIZE, LOCATION_COUNT, loadCatalog } from '../src/index.ts';
import { loadDataDir } from '../src/sim/data.ts';
import { type CardInput, type LocationInput, card, catalogWith } from './support.ts';

function issuesOf(cards: CardInput[], locations: LocationInput[] = []): readonly string[] {
  try {
    catalogWith(cards, locations);
  } catch (error) {
    expect(error).toBeInstanceOf(CatalogError);
    return (error as CatalogError).issues;
  }
  throw new Error('expected a CatalogError');
}

describe('game data (data/)', () => {
  it('loads every card and location of the repository', () => {
    const catalog = loadDataDir();
    expect(catalog.cards.size).toBeGreaterThanOrEqual(DECK_SIZE);
    expect(catalog.locations.size).toBeGreaterThanOrEqual(LOCATION_COUNT);
    for (const definition of catalog.cards.values()) {
      expect(definition.tags).toContain(`universe:${definition.extension}`);
    }
  });
});

describe('catalog validation', () => {
  it('adds the universe tag of the file once', () => {
    const catalog = catalogWith([card('x', { tags: ['universe:test', 'character:benj'] })]);
    expect(catalog.card('x').tags).toEqual(['universe:test', 'character:benj']);
  });

  it('refuses unknown effects and malformed tags', () => {
    expect(issuesOf([card('x', { abilities: [{ trigger: 'onReveal', effect: { type: 'teleport' } as never }] })])).toHaveLength(1);
    expect(issuesOf([card('x', { tags: ['Benj'] })])).toHaveLength(1);
  });

  it('refuses ongoing abilities that would depend on power or randomness', () => {
    const [drawIssue] = issuesOf([card('x', { abilities: [{ trigger: 'ongoing', effect: { type: 'draw' } }] })]);
    expect(drawIssue).toContain('cannot be ongoing');
    const [pickIssue] = issuesOf([
      card('x', { abilities: [{ trigger: 'ongoing', target: { type: 'cards', pick: 'weakest' }, effect: { type: 'addPower', amount: 1 } }] }),
    ]);
    expect(pickIssue).toContain('must pick "all"');
  });

  it('refuses location abilities that refer to an owner', () => {
    const buff = { trigger: 'ongoing', effect: { type: 'addPower', amount: 1 } } as const;
    expect(issuesOf([], [{ id: 'l1', name: 'l1', abilities: [buff] }])[0]).toContain('cannot target "self"');
    expect(issuesOf([], [{ id: 'l2', name: 'l2', abilities: [{ ...buff, target: { type: 'cards' } }] }])[0]).toContain('side "all"');
  });

  it('refuses duplicate ids', () => {
    expect(issuesOf([card('x'), card('x')])[0]).toContain('duplicate card id x');
    expect(() =>
      loadCatalog({
        cardFiles: [],
        locationFiles: [
          { name: 'a.json', content: { locations: [{ id: 'l', name: 'l' }] } },
          { name: 'b.json', content: { locations: [{ id: 'l', name: 'l' }] } },
        ],
      }),
    ).toThrow(/duplicate location id l/);
  });
});
