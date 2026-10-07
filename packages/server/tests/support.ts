import { type Catalog, Rng, buildRandomDeck } from '@ytcg-game/engine';
import { loadDataDir } from '@ytcg-game/engine/node';

export const catalog: Catalog = loadDataDir();

export function randomDeck(seed: number): string[] {
  const deck = buildRandomDeck(catalog, new Rng({ s: seed }));
  if (deck === null) {
    throw new Error('no legal deck');
  }
  return deck;
}

export const ALICE = { id: 'dev:alice', name: 'Alice' };
export const BOB = { id: 'dev:bob', name: 'Bob' };
