import type { CardInstance, GameState } from '../state.ts';
import { cardAt } from './state-access.ts';

// The last other card of the same owner revealed at this location before the copier, even if it has left since.
export function lastAllyPlayedHere(state: GameState, copier: string, location: number): string | null {
  const { owner, playOrder } = cardAt(state, copier);
  const before = (card: CardInstance): boolean =>
    card.owner === owner &&
    card.uid !== copier &&
    card.revealedAt === location &&
    card.playOrder !== null &&
    (playOrder === null || card.playOrder < playOrder);
  const candidates = Object.values(state.cards).filter(before);
  return (
    candidates.reduce<CardInstance | null>(
      (last, card) => (last === null || (card.playOrder ?? 0) > (last.playOrder ?? 0) ? card : last),
      null,
    )?.uid ?? null
  );
}
