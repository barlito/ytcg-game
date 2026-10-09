import type { CardView, GameResult, LocationView, PlayerView } from '@ytcg-game/engine';
import { describe, expect, it } from 'vitest';
import { decisiveCard, locationRows, resultKind, resultSubtitle, totalPower } from '../src/lib/endgame.ts';
import { backAngles, fanAngle, turnSegments } from '../src/lib/fan.ts';
import { leadOf } from '../src/lib/lead.ts';
import { viewWith } from './support.ts';

function card(uid: string, power: number): CardView {
  return { uid, defId: 'x', cost: 1, power, breakdown: { printed: power, modifier: 0, ongoing: [] }, statuses: {} };
}

// Location 0: you 12 vs 5 (won), location 1: 3 vs 9 (lost), location 2: 7 vs 7 (tie).
const result: GameResult = {
  winner: 0,
  locationWinners: [0, 1, null],
  locationPowers: [
    [12, 5],
    [3, 9],
    [7, 7],
  ],
  totalPower: [22, 21],
};

function finalView(you: 0 | 1): PlayerView {
  const view = viewWith({}, { you, status: 'ended', result });
  const [first, second, third] = view.locations;
  if (first === undefined || second === undefined || third === undefined) {
    throw new Error('three locations expected');
  }
  const sides = (mine: CardView[], theirs: CardView[]): LocationView['cards'] =>
    you === 0 ? { you: mine, opponent: theirs } : { you: theirs, opponent: mine };
  return {
    ...view,
    locations: [
      { ...first, cards: sides([card('a', 4), card('b', 8)], [card('c', 5)]) },
      { ...second, cards: sides([card('d', 3)], [card('e', 9)]) },
      third,
    ],
  };
}

describe('end of game', () => {
  it('reads the verdict of each location from the engine result, whoever you are', () => {
    expect(locationRows(finalView(0), result).map((row) => [row.you, row.opponent, row.verdict])).toEqual([
      [12, 5, 'won'],
      [3, 9, 'lost'],
      [7, 7, 'tie'],
    ]);
    expect(locationRows(finalView(1), result).map((row) => [row.you, row.opponent, row.verdict])).toEqual([
      [5, 12, 'lost'],
      [9, 3, 'won'],
      [7, 7, 'tie'],
    ]);
    expect(locationRows(finalView(0), null)).toEqual([]);
  });

  it('orders the total power from your side', () => {
    expect(totalPower(result, 0)).toEqual({ you: 22, opponent: 21 });
    expect(totalPower(result, 1)).toEqual({ you: 21, opponent: 22 });
    expect(totalPower(null, 0)).toBeNull();
  });

  it('titles and subtitles every kind of ending', () => {
    const score = { winner: 0, reason: 'score' } as const;
    const rows = locationRows(finalView(0), result);
    expect(resultKind(score, 0)).toBe('win');
    expect(resultKind(score, 1)).toBe('loss');
    expect(resultKind({ winner: null, reason: 'score' }, 0)).toBe('draw');
    expect(resultSubtitle(score, 0, rows.slice(0, 1), 'Bob')).toBe('Tu remportes 1 lieu sur 1 face à Bob');
    expect(resultSubtitle(score, 0, rows, 'Bob')).toBe(
      'À égalité de lieux, ta puissance totale t’offre la victoire face à Bob',
    );
    expect(resultSubtitle(score, 1, rows, 'Bob')).toBe(
      'À égalité de lieux, la puissance totale donne la victoire à Bob',
    );
    expect(resultSubtitle({ winner: 1, reason: 'score' }, 0, rows.slice(1, 2), 'Bob')).toBe(
      'Bob remporte 1 lieu sur 1',
    );
    expect(resultSubtitle({ winner: 0, reason: 'forfeit' }, 0, [], 'Bob')).toBe('Bob a quitté la partie.');
  });

  it('picks the strongest card of the winner on a location the winner took', () => {
    expect(decisiveCard(finalView(0), result)).toEqual({ card: card('b', 8), location: 0 });
    // Seen from the loser (you are player 1): player 0's best card on a location player 0 took.
    expect(decisiveCard(finalView(1), result)?.card.uid).toBe('b');
    expect(decisiveCard(finalView(0), { ...result, winner: null })).toBeNull();
    expect(decisiveCard(finalView(0), null)).toBeNull();
  });
});

describe('board helpers', () => {
  it('fans cards from -spread to +spread', () => {
    expect(fanAngle(0, 1, 7)).toBe(0);
    expect([0, 1, 2].map((index) => fanAngle(index, 3, 7))).toEqual([-7, 0, 7]);
    expect(backAngles(0)).toEqual([]);
    expect(backAngles(9)).toHaveLength(7);
    expect(backAngles(2)).toEqual([-8, 12]);
  });

  it('marks the six turn segments', () => {
    expect(turnSegments(3, 6)).toEqual(['past', 'past', 'current', 'future', 'future', 'future']);
  });

  it('says who leads a location', () => {
    expect(leadOf({ you: 2, opponent: 1 })).toBe('you');
    expect(leadOf({ you: 1, opponent: 2 })).toBe('opponent');
    expect(leadOf({ you: 0, opponent: 0 })).toBe('tie');
  });
});
