import { type Catalog, Rng, buildRandomDeck } from '@ytcg-game/engine';
import { loadDataDir } from '@ytcg-game/engine/node';
import type { DeckChoice } from '../src/protocol.ts';

export const catalog: Catalog = loadDataDir();

export function randomDeck(seed: number): DeckChoice {
  const rng = new Rng({ s: seed });
  const cards = buildRandomDeck(catalog, rng);
  if (cards === null) {
    throw new Error('no legal deck');
  }
  return { cards, location: rng.pick([...catalog.locations.keys()]) };
}

export const ALICE = { id: 'dev:alice', name: 'Alice' };
export const BOB = { id: 'dev:bob', name: 'Bob' };
