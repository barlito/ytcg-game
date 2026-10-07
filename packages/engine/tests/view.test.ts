import { describe, expect, it } from 'vitest';
import { projectForPlayer } from '../src/index.ts';
import { act, card, catalogWith, newGame, playTurn, uidOf } from './support.ts';

const catalog = catalogWith(
  [card('mine'), card('secret-a'), card('secret-b', { power: 4 })],
  [{ id: 'loc-hidden', name: 'Caché' }],
);

describe('player view', () => {
  it('shows only counts of the opponent hand, deck and face-down cards', () => {
    const state = newGame(catalog, {
      p0: ['mine'],
      p1: ['secret-a', 'secret-b'],
      locations: ['loc-a', 'loc-b', 'loc-hidden'],
    });
    const played = act(catalog, state, {
      type: 'play',
      player: 1,
      card: uidOf(state, 1, 'secret-a'),
      location: 0,
    }).state;

    const view = projectForPlayer(catalog, played, 0);
    expect(view.hand.map((card) => card.uid)).toEqual(played.players[0].hand);
    expect(view.opponent.handCount).toBe(played.players[1].hand.length);
    expect(view.opponent.deckCount).toBe(played.players[1].deck.length);
    expect(view.locations[0]?.opponentPendingCount).toBe(1);
    expect(view.locations[2]?.defId).toBeNull();

    const serialized = JSON.stringify(view);
    const hidden = [
      ...played.players[1].hand,
      ...played.players[1].deck,
      ...played.players[1].pending,
      ...played.players[0].deck,
    ];
    for (const uid of hidden) {
      expect(serialized).not.toContain(`"${uid}"`);
    }
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('loc-hidden');
  });

  it('shows the own face-down cards and every revealed card in clear', () => {
    const state = newGame(catalog, { p0: ['mine'], p1: ['secret-b'] });
    const pending = act(catalog, state, { type: 'play', player: 0, card: uidOf(state, 0, 'mine'), location: 1 }).state;
    expect(projectForPlayer(catalog, pending, 0).locations[1]?.yourPending.map((card) => card.defId)).toEqual(['mine']);

    const revealed = playTurn(catalog, state, { p0: [['mine', 1]], p1: [['secret-b', 1]] }).state;
    const location = projectForPlayer(catalog, revealed, 0).locations[1];
    expect(location?.cards.opponent.map((card) => card.defId)).toEqual(['secret-b']);
    expect(location?.power).toEqual({ you: 1, opponent: 4 });
  });
});
