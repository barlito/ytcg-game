import { DECK_SIZE } from '@ytcg-game/engine';
import { describe, expect, it } from 'vitest';
import { catalog, randomDeck } from '../src/catalog.ts';
import { deckBadge } from '../src/decks/deck-state.ts';
import { draftFrom, draftStatus } from '../src/decks/draft.ts';
import { NO_FILTER, buildPool, filterPool, normalizeText } from '../src/decks/pool.ts';
import { saveLabel } from '../src/decks/save-label.ts';
import { deckCover, pickFan, rarityRank } from '../src/decks/showcase.ts';
import type { Deck } from '../src/ytcg/schemas.ts';

const definitions = [...catalog.cards.values()];

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

describe('pool search', () => {
  it('ignores accents and case and matches the name only', () => {
    expect(normalizeText('  Ōyamaneko ÉCLAIR ')).toBe('oyamaneko eclair');
    const collection = definitions.map((definition) => ({
      id: definition.id,
      name: definition.name,
      extension: definition.extension,
      rarity: definition.rarity,
      unique: definition.unique,
      terrain: false,
      tags: [],
      quantity: 1,
      holoQuantity: 0,
    }));
    const pool = buildPool(catalog, collection);
    const [first] = pool.cards;
    const word = first?.definition.name.slice(1, 5).toUpperCase() ?? '';
    const shown = filterPool(pool.cards, { ...NO_FILTER, search: word });
    expect(shown).toContain(first);
    expect(shown.every((card) => normalizeText(card.definition.name).includes(normalizeText(word)))).toBe(true);
    expect(filterPool(pool.cards, { ...NO_FILTER, search: 'zzzz-introuvable' })).toHaveLength(0);
  });
});

describe('home showcase', () => {
  it('puts the most striking card in the middle of the fan', () => {
    const fan = pickFan(definitions, []);
    expect(fan).toHaveLength(3);
    const [left, centre, right] = fan.map(rarityRank);
    expect(centre).toBeGreaterThanOrEqual(left ?? 0);
    expect(centre).toBeGreaterThanOrEqual(right ?? 0);
  });

  it('falls back to the catalog when the player has fewer than three cards', () => {
    expect(pickFan(definitions.slice(0, 2), definitions)).toHaveLength(3);
    expect(pickFan([], [])).toEqual([]);
  });

  it('covers a deck with one of its known cards, none for an unknown deck', () => {
    const cards = randomDeck();
    const ids = new Set(cards);
    const cover = deckCover(catalog, deck(cards));
    expect(cover === null || definitions.some((card) => ids.has(card.id) && card.image === cover)).toBe(true);
    expect(deckCover(catalog, deck(['unknown']))).toBeNull();
  });
});

describe('deck tile badge', () => {
  it('says playable, how many cards are missing, or the game rules', () => {
    const cards = randomDeck();
    expect(deckBadge(catalog, deck(cards))).toEqual({ label: 'Jouable', ok: true, detail: null });
    const missing = deckBadge(catalog, deck(cards, { valid: false, missingCards: cards.slice(0, 2) }));
    expect(missing).toMatchObject({ label: '2 cartes manquent', ok: false });
    expect(deckBadge(catalog, deck(cards.slice(0, 3)))).toMatchObject({ label: 'Règles du duel', ok: false });
  });
});

describe('save button label', () => {
  it('gives the reason the deck cannot be saved yet', () => {
    const cards = randomDeck();
    const draft = { ...draftFrom(deck(cards)), name: 'Linettes' };
    expect(saveLabel(catalog, draft, draftStatus(catalog, draft), false)).toBe('Enregistrer le deck');
    expect(saveLabel(catalog, draft, draftStatus(catalog, draft), true)).toBe('Enregistrement…');
    const short = { ...draft, cards: cards.slice(0, DECK_SIZE - 3) };
    expect(saveLabel(catalog, short, draftStatus(catalog, short), false)).toBe('Encore 3 cartes');
    const unnamed = { ...draft, name: ' ' };
    expect(saveLabel(catalog, unnamed, draftStatus(catalog, unnamed), false)).toBe('Donne un nom au deck');
    const cheap = definitions.filter((card) => card.cost === 1).map((card) => card.id);
    const broken = { ...draft, cards: [...cheap, ...definitions.map((card) => card.id)].slice(0, DECK_SIZE) };
    const status = draftStatus(catalog, broken);
    if (status.gameRefusal !== null) {
      expect(saveLabel(catalog, broken, status, false)).toMatch(/^(Au (moins|plus)|Deck non jouable)/);
    }
  });
});
