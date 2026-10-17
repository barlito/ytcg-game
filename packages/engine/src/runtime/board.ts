import type { AbilitySource, Board, CardFilter, MoveDestination, Origin } from '../abilities/board.ts';
import type { StatusId } from '../abilities/statuses.ts';
import type { CardDefinition, Catalog } from '../catalog.ts';
import { Rng } from '../rng.ts';
import { MAX_HAND } from '../rules.ts';
import { type GameEvent, type GameState, PLAYERS, type PlayerIndex } from '../state.ts';
import { moveCard } from './move.ts';
import { runCrisis, startCrisis } from './crises.ts';
import { type OngoingBonus, ongoingBonuses } from './ongoing.ts';
import { cardMatches, inScope, onSide } from './filters.ts';
import * as hand from './hand.ts';
import * as statusChanges from './status-changes.ts';
import { cardAt, locationAt } from './state-access.ts';
import { absorbingStatus, acceptsChange, hasRule, stacksOf } from './statuses.ts';

// The board as abilities see it: queries on revealed cards and the elementary mutations.
export class GameBoard implements Board {
  readonly catalog: Catalog;
  readonly state: GameState;
  readonly rng: Rng;
  // Set by the Runtime: fires the "destroyed" abilities of a card once it left the board.
  onDestroyed: (uid: string) => void = () => undefined;
  // Set by the Runtime: fires the onStatusGained abilities of a card that just got a status.
  onStatusGained: (uid: string, status: StatusId) => void = () => undefined;
  // Set by the Runtime: fires the onMoved abilities of a card that just moved.
  onMoved: (uid: string) => void = () => undefined;
  // Set by the Runtime: runs the copied onReveal abilities for the copying card.
  copyReveal: (source: AbilitySource) => void = () => undefined;
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

  ownerOf(uid: string): PlayerIndex {
    return cardAt(this.state, uid).owner;
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
        location.cards[player].filter((uid) => cardMatches(this, uid, source, filter)),
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
    return ongoingBonuses(this, uid);
  }

  // Endormie, Charmée: the card's abilities do not fire and its ongoing bonuses stop counting.
  abilitiesOff(uid: string): boolean {
    return statusChanges.abilitiesOff(this, uid);
  }

  // The card as the source of its own abilities (it must be on the board).
  sourceOf(uid: string): AbilitySource {
    const card = cardAt(this.state, uid);
    if (card.location === null) {
      throw new RangeError(`Card ${uid} is not at a location`);
    }
    return { owner: card.owner, location: card.location, card: uid };
  }

  hasTag(uid: string, tag: string): boolean {
    return this.definitionOf(uid).tags.includes(tag);
  }

  hasStatus(uid: string, status: StatusId): boolean {
    return stacksOf(cardAt(this.state, uid), status) > 0;
  }

  startCrisis(uid: string): void {
    startCrisis(this, uid);
  }

  runCrisis(uid: string): void {
    runCrisis(this, uid);
  }

  locationPowers(): [number, number][] {
    const sum = (uids: readonly string[]): number => uids.reduce((total, uid) => total + this.power(uid), 0);
    return this.state.locations.map((location): [number, number] => [sum(location.cards[0]), sum(location.cards[1])]);
  }

  addPower(uid: string, delta: number, by?: Origin): number {
    const card = cardAt(this.state, uid);
    if (card.zone !== 'board' || delta === 0 || !acceptsChange(card, delta, by)) {
      return 0;
    }
    const shield = delta < 0 ? absorbingStatus(card, 'absorbsPowerLoss') : null;
    if (shield !== null) {
      statusChanges.dropStack(this, uid, shield, true);
      return 0;
    }
    card.powerModifier += delta;
    this.events.push({ type: 'powerChanged', card: uid, delta });
    return delta;
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
      statusChanges.dropStack(this, uid, shield, true);
      return;
    }
    const slot = locationAt(this.state, card.location).cards[card.owner];
    slot.splice(slot.indexOf(uid), 1);
    card.zone = 'destroyed';
    this.events.push({ type: 'cardDestroyed', card: uid });
    statusChanges.releaseCharms(this, uid);
    statusChanges.statusesOnDestroyed(this, uid);
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

  addStatus(uid: string, status: StatusId, stacks: number, by: Origin): void {
    statusChanges.addStatus(this, uid, { status, stacks, by });
  }

  removeStatus(uid: string, status: StatusId | null): void {
    statusChanges.removeStatus(this, uid, status);
  }

  loseStack(uid: string, status: StatusId): void {
    statusChanges.dropStack(this, uid, status, false);
  }
}
