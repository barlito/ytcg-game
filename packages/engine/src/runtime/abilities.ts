import type { CompiledAbility, Trigger } from '../abilities/ability.ts';
import type { AbilitySource } from '../abilities/board.ts';
import type { StatusId } from '../abilities/statuses.ts';
import type { GameBoard } from './board.ts';
import { opponentOf } from '../state.ts';
import { playedMatches } from './filters.ts';
import { cardAt, locationAt } from './state-access.ts';

// Fires the abilities of a card or a location for one trigger. New triggers only need a new call site.
export class AbilityRunner {
  private readonly board: GameBoard;
  // Cards resolving their onMoved abilities: moving one of them again does not re-fire them (no endless loop).
  private readonly moving = new Set<string>();

  constructor(board: GameBoard) {
    this.board = board;
  }

  fireCard(uid: string, trigger: Trigger, played?: string): void {
    const source = this.boardSource(uid, played);
    if (source !== null) {
      this.run(this.board.definitionOf(uid).abilities, source, trigger);
    }
  }

  // Only the onStatusGained abilities defined for that status.
  fireStatusGained(uid: string, status: StatusId): void {
    const source = this.boardSource(uid);
    if (source !== null) {
      const abilities = this.board.definitionOf(uid).abilities.filter((ability) => ability.params.status === status);
      this.run(abilities, source, 'onStatusGained');
    }
  }

  private boardSource(uid: string, played?: string): AbilitySource | null {
    const card = cardAt(this.board.state, uid);
    if (card.zone !== 'board' || card.location === null) {
      return null;
    }
    return { owner: card.owner, location: card.location, card: uid, ...playedPart(played) };
  }

  // The card has already left the board: its targets are relative to the location it was destroyed at.
  fireDestroyed(uid: string): void {
    const card = cardAt(this.board.state, uid);
    if (card.location === null) {
      return;
    }
    const source: AbilitySource = { owner: card.owner, location: card.location, card: uid };
    this.run(this.board.definitionOf(uid).abilities, source, 'onDestroyed');
  }

  fireMoved(uid: string): void {
    if (this.moving.has(uid)) {
      return;
    }
    this.moving.add(uid);
    this.fireCard(uid, 'onMoved');
    this.moving.delete(uid);
  }

  fireLocation(index: number, trigger: Trigger, played?: string): void {
    const location = locationAt(this.board.state, index);
    if (!location.revealed) {
      return;
    }
    const source: AbilitySource = { owner: null, location: index, card: null, ...playedPart(played) };
    this.run(this.board.catalog.location(location.defId).abilities, source, trigger);
  }

  // A card was just played at a location: the cards already there (revealing player first, in the order they
  // came) and then the location itself react. `location` is where it was played, even if it has moved since.
  fireCardPlayed(played: string, location: number): void {
    const card = cardAt(this.board.state, played);
    const here = locationAt(this.board.state, location);
    for (const owner of [card.owner, opponentOf(card.owner)]) {
      for (const uid of [...here.cards[owner]]) {
        this.fireCard(uid, 'onCardPlayedHere', played);
      }
    }
    this.fireLocation(location, 'onCardPlayedHere', played);
  }

  private run(abilities: readonly CompiledAbility[], source: AbilitySource, trigger: Trigger): void {
    for (const ability of abilities) {
      if (ability.trigger !== trigger || !this.playedAllows(ability, source)) {
        continue;
      }
      // A card destroyed by one of its own abilities stops there (its onDestroyed abilities still run).
      if (this.left(source, trigger)) {
        return;
      }
      if (!(ability.condition?.isMet(this.board, source) ?? true)) {
        continue;
      }
      this.announce(ability.trigger, source);
      const targets = ability.target.select(this.board, source);
      for (const effect of ability.effects) {
        effect.apply(this.board, source, targets);
      }
    }
  }

  // Reactions are announced before their effects so the animation can light up their source.
  private announce(trigger: Trigger, source: AbilitySource): void {
    if (trigger === 'onCardPlayedHere' || trigger === 'onDestroyed' || trigger === 'onMoved') {
      this.board.recordEvent({ type: 'abilityTriggered', trigger, card: source.card, location: source.location });
    }
  }

  private left(source: AbilitySource, trigger: Trigger): boolean {
    return trigger !== 'onDestroyed' && source.card !== null && cardAt(this.board.state, source.card).zone !== 'board';
  }

  private playedAllows(ability: CompiledAbility, source: AbilitySource): boolean {
    if (source.played === undefined) {
      return true;
    }
    return playedMatches(this.board, source, source.played, ability.params.played ?? { side: 'all' });
  }
}

function playedPart(played: string | undefined): { played?: string } {
  return played === undefined ? {} : { played };
}
