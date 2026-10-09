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
    expect(describeEvent({ type: 'cardRevealed', card: 'p1c3', defId, player: 1, location: 0 }, known, seats)).toBe(
      `Bob révèle ${name}.`,
    );
    expect(describeEvent({ type: 'powerChanged', card: 'p1c3', delta: -2 }, known, seats)).toBe(
      `${name} : −2 puissance.`,
    );
    expect(describeEvent({ type: 'statusChanged', card: 'p1c3', status: 'mad', stacks: 1 }, known, seats)).toBe(
      `${name} devient folle.`,
    );
  });

  it('logs the crisis drawn by a card gone mad', () => {
    expect(describeEvent({ type: 'crisisStarted', card: 'p1c3', crisis: 'implosion' }, known, seats)).toBe(
      `${name} est prise de folie : Implosion.`,
    );
  });

  it('logs moves, cost changes and cards added to hand', () => {
    expect(describeEvent({ type: 'cardMoved', card: 'p1c3', from: 0, to: 2 }, known, seats)).toBe(
      `${name} passe du lieu 1 au lieu 3.`,
    );
    expect(describeEvent({ type: 'costChanged', player: 0, card: 'p1c3', delta: -1 }, known, seats)).toBe(
      `${name} coûte 1 de moins.`,
    );
    expect(describeEvent({ type: 'costChanged', player: 0, card: null, delta: -2 }, known, seats)).toBe(
      'La prochaine carte que tu joues coûte 2 de moins.',
    );
    expect(describeEvent({ type: 'cardAddedToHand', player: 1, card: 'p1c20', defId }, known, seats)).toBe(
      `Bob ajoute ${name} à sa main.`,
    );
    expect(describeEvent({ type: 'cardAddedToHand', player: 1, card: null, defId: null }, known, seats)).toBe(
      'Bob ajoute une carte à sa main.',
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
