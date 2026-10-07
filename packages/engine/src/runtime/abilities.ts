import type { CompiledAbility, Trigger } from '../abilities/ability.ts';
import type { AbilitySource } from '../abilities/board.ts';
import type { GameBoard } from './board.ts';
import { cardAt, locationAt } from './state-access.ts';

// Fires the abilities of a card or a location for one trigger. New triggers only need a new call site.
export class AbilityRunner {
  private readonly board: GameBoard;

  constructor(board: GameBoard) {
    this.board = board;
  }

  fireCard(uid: string, trigger: Trigger): void {
    const card = cardAt(this.board.state, uid);
    if (card.zone !== 'board' || card.location === null) {
      return;
    }
    const source: AbilitySource = { owner: card.owner, location: card.location, card: uid };
    this.run(this.board.definitionOf(uid).abilities, source, trigger);
  }

  fireLocation(index: number, trigger: Trigger): void {
    const location = locationAt(this.board.state, index);
    if (!location.revealed) {
      return;
    }
    const source: AbilitySource = { owner: null, location: index, card: null };
    this.run(this.board.catalog.location(location.defId).abilities, source, trigger);
  }

  private run(abilities: readonly CompiledAbility[], source: AbilitySource, trigger: Trigger): void {
    for (const ability of abilities) {
      if (ability.trigger !== trigger) {
        continue;
      }
      // A card destroyed by one of its own abilities stops there.
      if (source.card !== null && cardAt(this.board.state, source.card).zone !== 'board') {
        return;
      }
      if (!(ability.condition?.isMet(this.board, source) ?? true)) {
        continue;
      }
      const targets = ability.target.select(this.board, source);
      for (const effect of ability.effects) {
        effect.apply(this.board, source, targets);
      }
    }
  }
}
