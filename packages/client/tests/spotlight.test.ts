import { describeCard } from '@ytcg-game/engine';
import { describe, expect, it } from 'vitest';
import { printedCard } from '../src/animation/placements.ts';
import { placeName, revealedPower, spotlightContent, spotlightTarget } from '../src/animation/spotlight.ts';
import { catalog } from '../src/catalog.ts';
import { rarityKey } from '../src/components/card/rarity.ts';
import { stepDelay } from '../src/animation/useCountSteps.ts';
import { viewWith } from './support.ts';

const [defId = ''] = catalog.cards.keys();
const [terrainId = ''] = catalog.locations.keys();
const seats = [
  { name: 'Alice', connected: true },
  { name: 'Bob', connected: true },
];

describe('spotlight', () => {
  it('shows the printed card with its owner, its place and its full text', () => {
    const view = viewWith({});
    const reveal = { type: 'cardRevealed', card: 'p1c2', defId, player: 1, location: 1 } as const;
    expect(spotlightContent(reveal, view, seats)).toEqual({
      kind: 'card',
      card: printedCard('p1c2', defId),
      owner: 'Bob',
      side: 'opponent',
      place: 'Lieu 2',
      text: describeCard(catalog, catalog.card(defId)),
      rarity: rarityKey(catalog.card(defId)),
      universe: catalog.extensions.get(catalog.card(defId).extension) ?? '',
      finalPower: catalog.card(defId).power,
    });
    expect(spotlightContent({ ...reveal, player: 0 }, view, seats)).toMatchObject({ owner: 'Toi', side: 'you' });
    expect(spotlightTarget(reveal)).toBe('[data-uid="p1c2"]');
  });

  it('shows a revealed terrain with who chose it, nothing for an unknown one', () => {
    const view = viewWith({});
    const [first, second, third] = view.locations;
    if (first === undefined || second === undefined || third === undefined) {
      throw new Error('three locations expected');
    }
    const revealed = {
      ...view,
      locations: [{ ...first, defId: terrainId, chosenBy: 'opponent' as const }, second, third],
    };
    const event = { type: 'locationRevealed', location: 0 } as const;
    expect(spotlightContent(event, revealed, seats)).toMatchObject({
      kind: 'location',
      defId: terrainId,
      owner: 'Terrain de Bob',
    });
    expect(placeName(revealed, 0)).toBe(catalog.location(terrainId).name);
    expect(spotlightContent(event, view, seats)).toBeNull();
    expect(spotlightTarget(event)).toBe('[data-location-header="0"]');
  });

  it('counts the power of a card through the effects of its own reveal only', () => {
    const reveal = (card: string) => ({ type: 'cardRevealed', card, defId, player: 1, location: 0 }) as const;
    const boost = (card: string, delta: number) => ({ type: 'powerChanged', card, delta }) as const;
    const upcoming = [reveal('a'), boost('a', 2), boost('b', 5), boost('a', 4), reveal('b'), boost('a', 1)];
    expect(revealedPower('a', 7, upcoming)).toBe(13);
    expect(revealedPower('b', 3, upcoming)).toBe(3);
    expect(revealedPower('z', 3, upcoming)).toBe(3);
    expect(revealedPower('a', 7, [])).toBe(7);
  });

  it('paces the counter at 120 ms per step, faster for a long jump', () => {
    expect(stepDelay(2)).toBe(120);
    expect(stepDelay(30)).toBe(30);
  });
});
