import { DECK_SIZE } from '@ytcg-game/engine';
import { describe, expect, it } from 'vitest';
import { catalog, randomDeck } from '../src/catalog.ts';
import { curveBars, curveLines } from '../src/decks/curve.ts';
import { deckState, playableDeckId } from '../src/decks/deck-state.ts';
import { draftFrom, draftPayload, draftReducer, draftStatus } from '../src/decks/draft.ts';
import { NO_FILTER, buildPool, filterOptions, filterPool } from '../src/decks/pool.ts';
import { errorsFromFailure, mapViolations } from '../src/decks/violations.ts';
import { interpretResponse } from '../src/ytcg/api.ts';
import { deckSchema } from '../src/ytcg/schemas.ts';
import type { Deck, OwnedCard } from '../src/ytcg/schemas.ts';

const [terrain = ''] = catalog.locations.keys();

function deck(cards: string[], overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'd1',
    name: 'Linettes',
    cards,
    terrain: null,
    valid: true,
    missingCards: [],
    issues: [],
    createdAt: '2026-10-08T10:00:00+02:00',
    updatedAt: '2026-10-08T10:00:00+02:00',
    ...overrides,
  };
}

function owned(id: string, terrainCard = false): OwnedCard {
  return {
    id,
    name: id,
    extension: 'x',
    rarity: 'common',
    unique: false,
    terrain: terrainCard,
    tags: [],
    quantity: 2,
    holoQuantity: 1,
  };
}

describe('deck draft', () => {
  const cards = randomDeck();

  it('adds and removes cards, never more than a deck holds', () => {
    let draft = draftFrom(null);
    for (const id of [...cards, 'one-too-many']) {
      draft = draftReducer(draft, { type: 'toggle', card: id });
    }
    expect(draft.cards).toEqual(cards);
    const [first = ''] = cards;
    draft = draftReducer(draft, { type: 'toggle', card: first });
    expect(draft.cards).toHaveLength(DECK_SIZE - 1);
    expect(draftReducer(draft, { type: 'rename', name: 'x'.repeat(60) }).name).toHaveLength(40);
  });

  it('can be saved once full and named, and tells what the game server would refuse', () => {
    const named = { ...draftFrom(deck(cards)), name: '  Linettes ' };
    expect(draftStatus(catalog, named)).toEqual({ full: true, canSave: true, gameRefusal: null });
    expect(draftPayload({ ...named, terrain })).toEqual({ name: 'Linettes', cards, terrain });
    expect(draftStatus(catalog, { ...named, name: ' ' }).canSave).toBe(false);
    const expensive = [...catalog.cards.values()].filter((card) => card.cost >= 5).map((card) => card.id);
    const status = draftStatus(catalog, { ...named, cards: expensive.slice(0, DECK_SIZE) });
    expect(status.gameRefusal).toContain('Courbe de coûts à revoir');
  });
});

describe('curve display', () => {
  it('counts cards per cost and checks the engine rules live', () => {
    const cheap = [...catalog.cards.values()].filter((card) => card.cost === 1).map((card) => card.id);
    const bars = curveBars(catalog, [...cheap.slice(0, 3), 'unknown-card']);
    expect(bars.map((bar) => bar.label)).toEqual(['1', '2', '3', '4', '5+']);
    expect(bars[0]?.count).toBe(3);
    const lines = curveLines(catalog, cheap.slice(0, 2));
    expect(lines[0]).toEqual({ kind: 'minimum', text: 'Au moins 2 cartes à 1', actual: 2, ok: true });
    expect(lines[1]).toEqual({ kind: 'minimum', text: 'Au moins 2 cartes à 2', actual: 0, ok: false });
  });
});

describe('ytcg violations', () => {
  it('maps indexed card violations to the card ids sent', () => {
    const errors = mapViolations(
      {
        name: ['Nom vide.'],
        'cards[1]': ['Carte introuvable dans ta collection.'],
        terrain: ['Pas un terrain.'],
        cards: ['12 cartes.'],
      },
      ['a', 'b'],
    );
    expect(errors.name).toEqual(['Nom vide.']);
    expect(errors.byCard).toEqual({ b: ['Carte introuvable dans ta collection.'] });
    expect(errors.terrain).toEqual(['Pas un terrain.']);
    expect(errors.cards).toEqual(['12 cartes.']);
    expect(mapViolations({ 'cards[9]': ['?'] }, ['a']).cards).toEqual(['?']);
  });

  it('turns every failure into a message, with the login link on 401', () => {
    const login = errorsFromFailure({ kind: 'login', message: 'Session expirée', loginUrl: 'https://login' }, []);
    expect(login).toMatchObject({ general: ['Session expirée'], loginUrl: 'https://login' });
    const invalid = errorsFromFailure({ kind: 'invalid', message: 'Deck invalide.', violations: { name: ['x'] } }, []);
    expect(invalid).toMatchObject({ general: ['Deck invalide.'], name: ['x'] });
  });
});

describe('ytcg responses', () => {
  const body = deck(randomDeck());

  it('reads successes, login requests, violations and refusals', () => {
    expect(interpretResponse(200, body, deckSchema)).toEqual({ ok: true, value: body });
    expect(interpretResponse(401, { error: 'Session expirée', loginUrl: 'https://l' }, deckSchema)).toEqual({
      ok: false,
      failure: { kind: 'login', message: 'Session expirée', loginUrl: 'https://l' },
    });
    expect(interpretResponse(422, { error: 'Deck invalide.', violations: { name: ['x'] } }, deckSchema)).toMatchObject({
      failure: { kind: 'invalid', violations: { name: ['x'] } },
    });
    expect(interpretResponse(409, { error: 'Tu as déjà 10 decks' }, deckSchema)).toMatchObject({
      failure: { kind: 'refused', message: 'Tu as déjà 10 decks' },
    });
  });

  it('treats anything unexpected as « unavailable »', () => {
    expect(interpretResponse(200, { nope: true }, deckSchema)).toMatchObject({ failure: { kind: 'unavailable' } });
    expect(interpretResponse(502, { error: 'x' }, deckSchema)).toMatchObject({ failure: { kind: 'unavailable' } });
    expect(interpretResponse(404, null, deckSchema)).toMatchObject({ failure: { kind: 'unavailable' } });
  });
});

describe('deck list', () => {
  const cards = randomDeck();

  it('tells playable, incomplete and rule-breaking decks apart', () => {
    expect(deckState(catalog, deck(cards))).toEqual({ kind: 'ready' });
    const incomplete = deck(cards, { valid: false, missingCards: ['a', 'b'] });
    expect(deckState(catalog, incomplete)).toEqual({ kind: 'incomplete', text: '2 cartes manquantes' });
    const unknown = deck([...cards.slice(1), 'not-in-the-game']);
    expect(deckState(catalog, unknown).kind).toBe('rules');
  });

  it('plays the chosen deck while playable, else the first playable one', () => {
    const decks = [deck(cards, { id: 'a', valid: false }), deck(cards, { id: 'b' }), deck(cards, { id: 'c' })];
    expect(playableDeckId(catalog, decks, 'c')).toBe('c');
    expect(playableDeckId(catalog, decks, 'a')).toBe('b');
    expect(playableDeckId(catalog, [], null)).toBeNull();
  });
});

describe('editor pool', () => {
  const cards = randomDeck();

  it('keeps owned cards the game knows, terrains apart, and filters them', () => {
    const pool = buildPool(catalog, [...cards.map((id) => owned(id)), owned('unknown'), owned(terrain, true)]);
    expect(pool.cards).toHaveLength(DECK_SIZE);
    expect(pool.terrains.map((location) => location.id)).toEqual([terrain]);
    const costs = pool.cards.map((card) => card.definition.cost);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
    expect(filterPool(pool.cards, NO_FILTER)).toHaveLength(DECK_SIZE);
    expect(filterPool(pool.cards, { ...NO_FILTER, cost: 1 }).every((card) => card.definition.cost === 1)).toBe(true);
    const options = filterOptions(catalog, pool.cards);
    expect(options.tags.some((tag) => tag.value.startsWith('universe:'))).toBe(false);
    const [universe] = options.universes;
    if (universe !== undefined) {
      const shown = filterPool(pool.cards, { ...NO_FILTER, universe: universe.value });
      expect(shown.every((card) => card.definition.extension === universe.value)).toBe(true);
    }
  });
});
