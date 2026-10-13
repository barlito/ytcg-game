import type { CompiledAbility } from '../abilities/ability.ts';
import {
  type AbilitySource,
  type Board,
  type CardFilter,
  type MoveDestination,
  isOngoingEffect,
} from '../abilities/board.ts';
import { STATUS_IDS, type StatusId, statusRule } from '../abilities/statuses.ts';
import type { CardDefinition, Catalog } from '../catalog.ts';
import { Rng } from '../rng.ts';
import { MAX_HAND } from '../rules.ts';
import { type GameEvent, type GameState, PLAYERS, type PlayerIndex } from '../state.ts';
import { moveCard } from './move.ts';
import { crisisBonus, runCrisis, startCrisis } from './crises.ts';
import { inScope, onSide } from './filters.ts';
import * as hand from './hand.ts';
import { cardAt, locationAt } from './state-access.ts';
import { absorbingStatus, hasRule, stacksOf } from './statuses.ts';

export interface OngoingBonus {
  source: AbilitySource;
  amount: number;
}

interface AbilityHolder {
  abilities: readonly CompiledAbility[];
  source: AbilitySource;
}

// The board as abilities see it: queries on revealed cards and the elementary mutations.
export class GameBoard implements Board {
  readonly catalog: Catalog;
  readonly state: GameState;
  readonly rng: Rng;
  // Set by the Runtime: fires the "destroyed" abilities of a card once it left the board.
  onDestroyed: (uid: string) => void = () => undefined;
  // Set by the Runtime: fires the onMad abilities of a card that just went mad.
  onMad: (uid: string) => void = () => undefined;
  private readonly events: GameEvent[];

  constructor(catalog: Catalog, state: GameState, events: GameEvent[]) {
    this.catalog = catalog;
    this.state = state;
    this.events = events;
    this.rng = new Rng(state.rng);
  }

  get turn(): number {
    return this.state.turn;
  }

  recordEvent(event: GameEvent): void {
    this.events.push(event);
  }

  defIdOf(uid: string): string {
    return cardAt(this.state, uid).defId;
  }

  get handContext(): hand.HandContext {
    return { catalog: this.catalog, state: this.state, events: this.events };
  }

  definitionOf(uid: string): CardDefinition {
    return this.catalog.card(cardAt(this.state, uid).defId);
  }

  cardsMatching(source: AbilitySource, filter: CardFilter): string[] {
    return this.state.locations.flatMap((location, index) => {
      if (!inScope(filter, source, index)) {
        return [];
      }
      return PLAYERS.filter((player) => onSide(filter, source, player)).flatMap((player) =>
        location.cards[player].filter((uid) => this.matches(uid, source, filter)),
      );
    });
  }

  power(uid: string): number {
    return this.basePower(uid) + this.ongoingBonuses(uid).reduce((sum, bonus) => sum + bonus.amount, 0);
  }

  // Printed power plus the permanent modifiers (addPower), without the ongoing bonuses.
  basePower(uid: string): number {
    const card = cardAt(this.state, uid);
    return this.catalog.card(card.defId).power + card.powerModifier;
  }

  // Non-zero ongoing bonuses received by a board card, one entry per source.
  ongoingBonuses(uid: string): OngoingBonus[] {
    const card = cardAt(this.state, uid);
    if (card.zone !== 'board') {
      return [];
    }
    const keepsLosses = !hasRule(card, 'preventsPowerLoss');
    const bonuses: OngoingBonus[] = [];
    for (const { abilities, source } of this.ongoingHolders()) {
      const amount = abilities.reduce(
        (sum, ability) => sum + this.ongoingBonusFor(uid, ability, source, keepsLosses),
        0,
      );
      if (amount !== 0) {
        bonuses.push({ source, amount });
      }
    }
    const crisis = crisisBonus(this.state, uid, keepsLosses);
    return crisis === 0 ? bonuses : [...bonuses, { source: this.sourceOf(uid), amount: crisis }];
  }

  // The card as the source of its own abilities (it must be on the board).
  sourceOf(uid: string): AbilitySource {
    const card = cardAt(this.state, uid);
    if (card.location === null) {
      throw new RangeError(`Card ${uid} is not at a location`);
    }
    return { owner: card.owner, location: card.location, card: uid };
  }

  hasStatus(uid: string, status: StatusId): boolean {
    return stacksOf(cardAt(this.state, uid), status) > 0;
  }

  becomeMad(uid: string): void {
    startCrisis(this, uid);
    if (cardAt(this.state, uid).zone === 'board') {
      this.onMad(uid);
    }
  }

  runCrisis(uid: string): void {
    runCrisis(this, uid);
  }

  locationPowers(): [number, number][] {
    const sum = (uids: readonly string[]): number => uids.reduce((total, uid) => total + this.power(uid), 0);
    return this.state.locations.map((location): [number, number] => [sum(location.cards[0]), sum(location.cards[1])]);
  }

  addPower(uid: string, delta: number): void {
    const card = cardAt(this.state, uid);
    if (card.zone !== 'board' || delta === 0 || (delta < 0 && hasRule(card, 'preventsPowerLoss'))) {
      return;
    }
    const shield = delta < 0 ? absorbingStatus(card, 'absorbsPowerLoss') : null;
    if (shield !== null) {
      this.spendStack(uid, shield);
      return;
    }
    card.powerModifier += delta;
    this.events.push({ type: 'powerChanged', card: uid, delta });
  }

  draw(player: PlayerIndex, count: number): void {
    const state = this.state.players[player];
    for (let i = 0; i < count; i++) {
      const uid = state.deck[0];
      if (uid === undefined || state.hand.length >= MAX_HAND) {
        return;
      }
      state.deck.shift();
      state.hand.push(uid);
      cardAt(this.state, uid).zone = 'hand';
      this.events.push({ type: 'cardDrawn', player, card: uid });
    }
  }

  destroy(uid: string): void {
    const card = cardAt(this.state, uid);
    if (card.zone !== 'board' || card.location === null || hasRule(card, 'preventsDestroy')) {
      return;
    }
    const shield = absorbingStatus(card, 'absorbsDestroy');
    if (shield !== null) {
      this.spendStack(uid, shield);
      return;
    }
    const slot = locationAt(this.state, card.location).cards[card.owner];
    slot.splice(slot.indexOf(uid), 1);
    card.zone = 'destroyed';
    this.events.push({ type: 'cardDestroyed', card: uid });
    this.onDestroyed(uid);
  }

  move(uid: string, destination: MoveDestination): void {
    moveCard(this, uid, destination);
  }

  addHandCost(player: PlayerIndex, amount: number, tag: string | null): void {
    hand.addHandCost(this.handContext, player, amount, tag);
  }

  addNextCost(player: PlayerIndex, amount: number, tag: string | null): void {
    hand.addNextCost(this.handContext, player, amount, tag);
  }

  addToHand(player: PlayerIndex, defId: string, from?: string): void {
    hand.addToHand(this.handContext, player, defId, from);
  }

  // A shield status pays one stack to cancel what was about to happen.
  private spendStack(uid: string, status: StatusId): void {
    const card = cardAt(this.state, uid);
    const left = stacksOf(card, status) - 1;
    if (left > 0) {
      card.statuses[status] = left;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- statuses is a plain JSON record
      delete card.statuses[status];
    }
    this.events.push({ type: 'statusChanged', card: uid, status, stacks: left, spent: true });
  }

  addStatus(uid: string, status: StatusId, stacks: number): void {
    const card = cardAt(this.state, uid);
    if (card.zone !== 'board' || stacks <= 0) {
      return;
    }
    const previous = stacksOf(card, status);
    const total = previous + stacks;
    card.statuses[status] = total;
    this.events.push({ type: 'statusChanged', card: uid, status, stacks: total });
    if (previous === 0) {
      statusRule(status).onGained?.(this, uid);
    }
    statusRule(status).onStacksChanged?.(this, uid, total);
  }

  removeStatus(uid: string, status: StatusId | null): void {
    const card = cardAt(this.state, uid);
    for (const id of status === null ? STATUS_IDS : [status]) {
      if (stacksOf(card, id) > 0) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- statuses is a plain JSON record
        delete card.statuses[id];
        this.events.push({ type: 'statusChanged', card: uid, status: id, stacks: 0 });
      }
      if (id === 'mad') {
        card.crisis = null;
      }
    }
  }

  private matches(uid: string, source: AbilitySource, filter: CardFilter): boolean {
    if (!filter.includeSelf && uid === source.card) {
      return false;
    }
    if (filter.status !== undefined && stacksOf(cardAt(this.state, uid), filter.status) === 0) {
      return false;
    }
    return filter.tag === undefined || this.definitionOf(uid).tags.includes(filter.tag);
  }

  // A card protected from power loss ignores the negative ongoing bonuses.
  private ongoingBonusFor(uid: string, ability: CompiledAbility, source: AbilitySource, keepsLosses: boolean): number {
    if (ability.trigger !== 'ongoing' || !(ability.condition?.isMet(this, source) ?? true)) {
      return 0;
    }
    if (!ability.target.select(this, source).includes(uid)) {
      return 0;
    }
    return ability.effects
      .filter(isOngoingEffect)
      .map((effect) => effect.ongoingBonus(this, source))
      .filter((bonus) => bonus > 0 || keepsLosses)
      .reduce((sum, bonus) => sum + bonus, 0);
  }

  private *ongoingHolders(): Generator<AbilityHolder> {
    for (const [index, location] of this.state.locations.entries()) {
      if (location.revealed) {
        const { abilities } = this.catalog.location(location.defId);
        yield { abilities, source: { owner: null, location: index, card: null } };
      }
      for (const player of PLAYERS) {
        for (const uid of location.cards[player]) {
          yield { abilities: this.definitionOf(uid).abilities, source: { owner: player, location: index, card: uid } };
        }
      }
    }
  }
}
