import type { DeckChange } from '../ytcg/schemas.ts';

// What ytcg did to a deck while the player was away (it reconciles decks with the collection on read).
export function changeText(change: DeckChange): string {
  switch (change.type) {
    case 'removed':
      return `${change.name} retirée (plus possédée)`;
    case 'switchedToNormal':
      return `${change.name} passe en normale`;
    case 'switchedToHolo':
      return `${change.name} passe en holo`;
  }
}

export function noticeTitle(deckName: string): string {
  return `Ton deck ${deckName} a changé`;
}
