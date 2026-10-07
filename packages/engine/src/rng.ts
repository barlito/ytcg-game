export interface RngState {
  s: number;
}

export function seedFromString(seed: string): number {
  // FNV-1a, 32 bits
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// mulberry32: one uint32 of state, so the generator lives inside the serialisable game state.
export class Rng {
  private readonly state: RngState;

  constructor(state: RngState) {
    this.state = state;
  }

  next(): number {
    this.state.s = (this.state.s + 0x6d2b79f5) | 0;
    let t = this.state.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError('Cannot pick from an empty list');
    }
    return items[this.int(items.length)] as T;
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [items[i], items[j]] = [items[j] as T, items[i] as T];
    }
    return items;
  }
}
