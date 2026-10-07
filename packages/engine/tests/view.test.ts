import { describe, expect, it } from 'vitest';
import { projectEventsForPlayer, projectForPlayer } from '../src/index.ts';
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
    expect(view.opponent.pendingCount).toBe(1);
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

describe('face-down plays', () => {
  it('never tell the opponent where a card was played', () => {
    const state = newGame(catalog, { p1: ['secret-a'] });
    const at = (location: number): string =>
      JSON.stringify(
        projectForPlayer(
          catalog,
          act(catalog, state, { type: 'play', player: 1, card: uidOf(state, 1, 'secret-a'), location }).state,
          0,
        ),
      );
    expect(at(0)).toBe(at(2));
  });
});

describe('player events', () => {
  it('hides the card the opponent drew, and only that', () => {
    const state = newGame(catalog, { p0: ['mine'], p1: ['secret-b'] });
    const { events } = playTurn(catalog, state, { p0: [['mine', 0]], p1: [['secret-b', 0]] });
    const opponentDraws = events.filter((event) => event.type === 'cardDrawn' && event.player === 1);
    expect(opponentDraws.length).toBeGreaterThan(0);

    const projected = projectEventsForPlayer(events, 0);
    for (const event of projected) {
      if (event.type === 'cardDrawn') {
        expect(event.card === null).toBe(event.player === 1);
      }
    }
    expect(projected.filter((event) => event.type === 'cardRevealed')).toHaveLength(2);
  });
});
