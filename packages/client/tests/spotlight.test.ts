import { describeCard } from '@ytcg-game/engine';
import { describe, expect, it } from 'vitest';
import { printedCard } from '../src/animation/placements.ts';
import { placeName, spotlightContent, spotlightTarget } from '../src/animation/spotlight.ts';
import { catalog } from '../src/catalog.ts';
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
});
