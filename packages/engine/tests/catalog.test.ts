import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CatalogError, DECK_SIZE, LOCATION_COUNT, loadCatalog } from '../src/index.ts';
import { renderCardsDoc } from '../src/sim/cards-doc.ts';
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

  it('only holds real terrains of a known universe, each with its ytcg artwork', () => {
    const catalog = loadDataDir();
    for (const location of catalog.locations.values()) {
      expect(location.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(catalog.extensions.has(location.extension ?? '')).toBe(true);
      expect(location.image).not.toBeNull();
      expect(catalog.cards.has(location.id)).toBe(false);
    }
    expect([...catalog.cards.values()].filter((definition) => definition.image === null)).toEqual([]);
  });
});

describe('catalog validation', () => {
  it('adds the universe tag of the file once', () => {
    const catalog = catalogWith([card('x', { tags: ['universe:test', 'character:benj'] })]);
    expect(catalog.card('x').tags).toEqual(['universe:test', 'character:benj']);
  });

  it('refuses unknown effects and malformed tags', () => {
    expect(
      issuesOf([card('x', { abilities: [{ trigger: 'onReveal', effect: { type: 'teleport' } as never }] })]),
    ).toHaveLength(1);
    expect(issuesOf([card('x', { tags: ['Benj'] })])).toHaveLength(1);
  });

  it('refuses ongoing abilities that would depend on power or randomness', () => {
    const [drawIssue] = issuesOf([card('x', { abilities: [{ trigger: 'ongoing', effect: { type: 'draw' } }] })]);
    expect(drawIssue).toContain('cannot be ongoing');
    const [pickIssue] = issuesOf([
      card('x', {
        abilities: [
          { trigger: 'ongoing', target: { type: 'cards', pick: 'weakest' }, effect: { type: 'addPower', amount: 1 } },
        ],
      }),
    ]);
    expect(pickIssue).toContain('must pick "all"');
  });

  it('refuses location abilities that refer to an owner', () => {
    const buff = { trigger: 'ongoing', effect: { type: 'addPower', amount: 1 } } as const;
    expect(issuesOf([], [{ id: 'l1', name: 'l1', abilities: [buff] }])[0]).toContain('cannot target "self"');
    expect(issuesOf([], [{ id: 'l2', name: 'l2', abilities: [{ ...buff, target: { type: 'cards' } }] }])[0]).toContain(
      'side "all"',
    );
  });

  it('refuses invalid trigger combinations', () => {
    const effect = { type: 'addPower', amount: 1 } as const;
    expect(issuesOf([card('x', { abilities: [{ trigger: 'onReveal', played: {}, effect }] })])[0]).toContain(
      'only goes with the onCardPlayedHere trigger',
    );
    expect(issuesOf([card('x', { abilities: [{ trigger: 'onDestroyed', effect }] })])[0]).toContain(
      'a destroyed card cannot target itself',
    );
    expect(
      issuesOf([], [{ id: 'l', name: 'l', abilities: [{ trigger: 'onDestroyed', effect: { type: 'draw' } }] }])[0],
    ).toContain('no onDestroyed trigger');
    expect(
      issuesOf([], [{ id: 'l', name: 'l', abilities: [{ trigger: 'onMad', effect: { type: 'draw' } }] }])[0],
    ).toContain('a location is never mad');
    expect(
      issuesOf(
        [],
        [
          {
            id: 'l',
            name: 'l',
            abilities: [{ trigger: 'onReveal', condition: { type: 'mad' }, effect: { type: 'draw' } }],
          },
        ],
      )[0],
    ).toContain('a location is never mad');
    expect(
      issuesOf(
        [],
        [
          {
            id: 'l',
            name: 'l',
            abilities: [{ trigger: 'onCardPlayedHere', played: { side: 'ally' }, effect: { type: 'draw' } }],
          },
        ],
      )[0],
    ).toContain('side "all"');
    expect(() =>
      catalogWith(
        [card('x', { abilities: [{ trigger: 'onDestroyed', effect: { type: 'draw' } }] })],
        [{ id: 'l', name: 'l', abilities: [{ trigger: 'onCardPlayedHere', effect: { type: 'draw' } }] }],
      ),
    ).not.toThrow();
  });

  it('refuses malformed building blocks', () => {
    const abilities = (effect: object): CardInput['abilities'] => [{ trigger: 'onReveal', effect: effect as never }];
    expect(issuesOf([card('x', { abilities: abilities({ type: 'addCost', amount: 0 }) })])).toHaveLength(1);
    expect(issuesOf([card('x', { abilities: abilities({ type: 'move', destination: 'up' }) })])).toHaveLength(1);
    expect(issuesOf([card('x', { abilities: abilities({ type: 'addToHand', count: 9 }) })])).toHaveLength(1);
  });

  it('checks that addToHand names a card of the catalog, and a location names its card', () => {
    expect(
      issuesOf([card('x', { abilities: [{ trigger: 'onReveal', effect: { type: 'addToHand', card: 'nope' } }] })]),
    ).toEqual(['card x: addToHand refers to unknown card "nope"']);
    expect(
      issuesOf([], [{ id: 'l', name: 'l', abilities: [{ trigger: 'onReveal', effect: { type: 'addToHand' } }] }])[0],
    ).toContain('needs a "card"');
    expect(() =>
      catalogWith([
        card('y'),
        card('x', { abilities: [{ trigger: 'onReveal', effect: { type: 'addToHand', card: 'y' } }] }),
      ]),
    ).not.toThrow();
  });

  it('validates the rules of a location', () => {
    expect(issuesOf([], [{ id: 'l', name: 'l', rules: { capacity: 5 } }])).toHaveLength(1);
    expect(issuesOf([], [{ id: 'l', name: 'l', rules: { capacity: 0 } }])).toHaveLength(1);
    expect(issuesOf([], [{ id: 'l', name: 'l', rules: { openFromTurn: 4, closedFromTurn: 3 } }])[0]).toContain(
      'no card can ever be played here',
    );
    expect(
      catalogWith([], [{ id: 'l', name: 'l', rules: { capacity: 3, openFromTurn: 2, closedFromTurn: 5 } }]).location(
        'l',
      ).rules,
    ).toEqual({
      capacity: 3,
      openFromTurn: 2,
      closedFromTurn: 5,
    });
  });

  it('reads the optional artwork of cards and locations', () => {
    const catalog = catalogWith(
      [card('x', { image: 'x-6a7634b988a9.png' }), card('y')],
      [{ id: 'l', name: 'l', image: 'l-6a7634b988a9.webp' }],
    );
    expect(catalog.card('x').image).toBe('x-6a7634b988a9.png');
    expect(catalog.card('y').image).toBeNull();
    expect(catalog.location('l').image).toBe('l-6a7634b988a9.webp');
    expect(catalog.location('loc-a').image).toBeNull();
    expect(issuesOf([card('x', { image: '../secret.png' })])).toHaveLength(1);
  });

  it('refuses a terrain that is also a playable card', () => {
    expect(issuesOf([card('place')], [{ id: 'place', name: 'Lieu' }])).toEqual(['place is both a card and a location']);
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

describe('docs/cards.md', () => {
  it('is up to date with data/ (run `make cards-doc`)', () => {
    const path = fileURLToPath(new URL('../../../docs/cards.md', import.meta.url));
    expect(readFileSync(path, 'utf8')).toBe(renderCardsDoc(loadDataDir()));
  });
});
