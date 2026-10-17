import type { CompiledAbility } from '../abilities/ability.ts';
import { type AbilitySource, isOngoingEffect } from '../abilities/board.ts';
import { PLAYERS } from '../state.ts';
import type { GameBoard } from './board.ts';
import { crisisBonus } from './crises.ts';
import { cardAt } from './state-access.ts';
import { hasRule } from './statuses.ts';

export interface OngoingBonus {
  source: AbilitySource;
  amount: number;
}

interface AbilityHolder {
  abilities: readonly CompiledAbility[];
  source: AbilitySource;
}

// The card receiving the bonuses, and which signs it accepts from one source (Coriace drops the losses).
interface Receiver {
  uid: string;
  gains: boolean;
  losses: boolean;
}

// Non-zero ongoing bonuses received by a board card, one entry per source.
export function ongoingBonuses(board: GameBoard, uid: string): OngoingBonus[] {
  const card = cardAt(board.state, uid);
  if (card.zone !== 'board') {
    return [];
  }
  const losses = !hasRule(card, 'preventsPowerLoss');
  const bonuses: OngoingBonus[] = [];
  for (const { abilities, source } of ongoingHolders(board)) {
    const receiver = { uid, gains: true, losses };
    const amount = abilities.reduce((sum, ability) => sum + bonusFor(board, receiver, ability, source), 0);
    if (amount !== 0) {
      bonuses.push({ source, amount });
    }
  }
  // A crisis is the card's madness, not an ability: it keeps acting on a card whose abilities are off.
  const crisis = crisisBonus(board.state, uid, losses);
  return crisis === 0 ? bonuses : [...bonuses, { source: board.sourceOf(uid), amount: crisis }];
}

function bonusFor(board: GameBoard, receiver: Receiver, ability: CompiledAbility, source: AbilitySource): number {
  if (ability.trigger !== 'ongoing' || !(ability.condition?.isMet(board, source) ?? true)) {
    return 0;
  }
  if (!ability.target.select(board, source).includes(receiver.uid)) {
    return 0;
  }
  return ability.effects
    .filter(isOngoingEffect)
    .map((effect) => effect.ongoingBonus(board, source))
    .filter((bonus) => (bonus > 0 ? receiver.gains : receiver.losses))
    .reduce((sum, bonus) => sum + bonus, 0);
}

// Revealed locations and the board cards whose abilities are on.
function* ongoingHolders(board: GameBoard): Generator<AbilityHolder> {
  for (const [index, location] of board.state.locations.entries()) {
    if (location.revealed) {
      const { abilities } = board.catalog.location(location.defId);
      yield { abilities, source: { owner: null, location: index, card: null } };
    }
    const cards = PLAYERS.flatMap((owner) => location.cards[owner].map((uid) => ({ owner, uid })));
    for (const { owner, uid } of cards.filter((entry) => !board.abilitiesOff(entry.uid))) {
      yield { abilities: board.definitionOf(uid).abilities, source: { owner, location: index, card: uid } };
    }
  }
}
