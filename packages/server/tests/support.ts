import { type Catalog, Rng } from '@ytcg-game/engine';
import { loadDataDir } from '@ytcg-game/engine/node';

export const catalog: Catalog = loadDataDir();

export function randomDeck(seed: number): string[] {
  return new Rng({ s: seed }).shuffle([...catalog.cards.keys()]).slice(0, 12);
}

export const ALICE = { id: 'dev:alice', name: 'Alice' };
export const BOB = { id: 'dev:bob', name: 'Bob' };
