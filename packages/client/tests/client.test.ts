import { DECK_SIZE, validateDeck } from '@ytcg-game/engine';
import { describe, expect, it } from 'vitest';
import { artworkUrl } from '../src/artwork.ts';
import { catalog, randomDeck } from '../src/catalog.ts';
import { actionErrorText } from '../src/errors.ts';
import { describeEvent } from '../src/events.ts';

const seats = [
  { name: 'Alice', connected: true },
  { name: 'Bob', connected: true },
];

describe('bundled catalog', () => {
  it('loads the same game data as the server', () => {
    expect(catalog.cards.size).toBeGreaterThanOrEqual(DECK_SIZE);
    expect(catalog.locations.size).toBeGreaterThanOrEqual(3);
  });

  it('builds legal random decks', () => {
    for (let i = 0; i < 20; i++) {
      expect(validateDeck(catalog, randomDeck())).toEqual([]);
    }
  });
});

describe('artwork', () => {
  it('points at the ytcg uploads, only for cards and terrains with an image', () => {
    expect(artworkUrl('barlito 1.png')).toBe('https://ytcg.youlz.fr/uploads/cards/barlito%201.png');
    expect(artworkUrl(null)).toBeNull();
    const [terrain] = catalog.locations.values();
    expect(terrain?.image).toEqual(expect.any(String));
  });
});

describe('game log', () => {
  const [defId = ''] = catalog.cards.keys();
  const name = catalog.card(defId).name;
  const known = new Map([['p1c3', defId]]);

  it('names revealed cards and players', () => {
    expect(describeEvent({ type: 'cardRevealed', card: 'p1c3', player: 1, location: 0 }, known, seats)).toBe(
      `Bob révèle ${name}.`,
    );
    expect(describeEvent({ type: 'powerChanged', card: 'p1c3', delta: -2 }, known, seats)).toBe(
      `${name} : −2 puissance.`,
    );
    expect(describeEvent({ type: 'statusChanged', card: 'p1c3', status: 'mad', stacks: 1 }, known, seats)).toBe(
      `${name} devient folle.`,
    );
  });

  it('stays vague about unknown cards and silent about draws', () => {
    expect(describeEvent({ type: 'cardDestroyed', card: 'p0c9' }, known, seats)).toBe('Une carte est détruite.');
    expect(describeEvent({ type: 'cardDrawn', player: 1, card: null }, known, seats)).toBeNull();
  });
});

describe('error messages', () => {
  it('shows engine refusals in French and keeps unknown messages', () => {
    expect(actionErrorText('notEnoughEnergy', 'card p0c1 costs 3, 1 energy left')).toBe("Pas assez d'énergie.");
    expect(actionErrorText('somethingNew', 'Message du serveur.')).toBe('Message du serveur.');
  });
});
