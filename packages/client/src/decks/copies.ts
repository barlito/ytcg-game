import type { OwnedCard } from '../ytcg/schemas.ts';

// What the player holds of a card: both kinds is the only case where holo is a choice.
export type CopyKind = 'none' | 'normal' | 'holo' | 'both';

export function copyKind(owned: Pick<OwnedCard, 'quantity' | 'holoQuantity'> | undefined): CopyKind {
  if (owned === undefined) {
    return 'none';
  }
  const holo = owned.holoQuantity > 0;
  const normal = owned.quantity - owned.holoQuantity > 0;
  if (holo && normal) {
    return 'both';
  }
  if (holo) {
    return 'holo';
  }
  return normal ? 'normal' : 'none';
}

// Only holo copies: holo is forced; both kinds: the player's choice; otherwise normal.
export function playsHolo(kind: CopyKind | undefined, chosen: boolean): boolean {
  return kind === 'holo' || (kind === 'both' && chosen);
}

export function kindsOf(collection: readonly OwnedCard[]): ReadonlyMap<string, CopyKind> {
  return new Map(collection.map((owned) => [owned.id, copyKind(owned)]));
}
