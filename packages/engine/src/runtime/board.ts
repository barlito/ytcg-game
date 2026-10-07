import type { CompiledAbility } from '../abilities/ability.ts';
import { type AbilitySource, type Board, type CardFilter, isOngoingEffect } from '../abilities/board.ts';
import type { CardDefinition, Catalog } from '../catalog.ts';
import { Rng } from '../rng.ts';
import { MAX_HAND } from '../rules.ts';
import { type GameEvent, type GameState, PLAYERS, type PlayerIndex, opponentOf } from '../state.ts';
import { cardAt, locationAt } from './state-access.ts';

interface AbilityHolder {
  abilities: readonly CompiledAbility[];
  source: AbilitySource;
}

// The board as abilities see it: queries on revealed cards and the elementary mutations.
export class GameBoard implements Board {
  readonly catalog: Catalog;
  readonly state: GameState;
  readonly rng: Rng;
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
    const card = cardAt(this.state, uid);
    const base = this.catalog.card(card.defId).power + card.powerModifier;
    if (card.zone !== 'board') {
      return base;
    }
    let bonus = 0;
    for (const { abilities, source } of this.ongoingHolders()) {
      for (const ability of abilities) {
        bonus += this.ongoingBonusFor(uid, ability, source);
      }
    }
    return base + bonus;
  }

  locationPowers(): [number, number][] {
    const sum = (uids: readonly string[]): number => uids.reduce((total, uid) => total + this.power(uid), 0);
    return this.state.locations.map((location): [number, number] => [sum(location.cards[0]), sum(location.cards[1])]);
  }

  addPower(uid: string, delta: number): void {
    const card = cardAt(this.state, uid);
    if (card.zone !== 'board' || delta === 0) {
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
    if (card.zone !== 'board' || card.location === null) {
      return;
    }
    const slot = locationAt(this.state, card.location).cards[card.owner];
    slot.splice(slot.indexOf(uid), 1);
    card.zone = 'destroyed';
    this.events.push({ type: 'cardDestroyed', card: uid });
  }

  private matches(uid: string, source: AbilitySource, filter: CardFilter): boolean {
    if (!filter.includeSelf && uid === source.card) {
      return false;
    }
    return filter.tag === undefined || this.definitionOf(uid).tags.includes(filter.tag);
  }

  private ongoingBonusFor(uid: string, ability: CompiledAbility, source: AbilitySource): number {
    if (ability.trigger !== 'ongoing' || !(ability.condition?.isMet(this, source) ?? true)) {
      return 0;
    }
    if (!ability.target.select(this, source).includes(uid)) {
      return 0;
    }
    return isOngoingEffect(ability.effect) ? ability.effect.ongoingBonus(this, source) : 0;
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

function inScope(filter: CardFilter, source: AbilitySource, location: number): boolean {
  switch (filter.scope) {
    case 'here':
      return location === source.location;
    case 'elsewhere':
      return location !== source.location;
    case 'everywhere':
      return true;
  }
}

// A location has no owner: only side "all" can match there.
function onSide(filter: CardFilter, source: AbilitySource, player: PlayerIndex): boolean {
  if (filter.side === 'all') {
    return true;
  }
  if (source.owner === null) {
    return false;
  }
  return player === (filter.side === 'ally' ? source.owner : opponentOf(source.owner));
}
