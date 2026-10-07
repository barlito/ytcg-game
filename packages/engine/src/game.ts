import type { CompiledAbility, Trigger } from './abilities/ability.ts';
import type { AbilitySource, Board, CardFilter } from './abilities/board.ts';
import type { CardDefinition, Catalog } from './catalog.ts';
import { GameSetupError, IllegalActionError } from './errors.ts';
import { Rng, seedFromString } from './rng.ts';
import { DECK_SIZE, LOCATION_CAPACITY, LOCATION_COUNT, MAX_HAND, MAX_TURNS, STARTING_HAND } from './rules.ts';
import {
  type CardInstance,
  type GameAction,
  type GameEvent,
  type GameResult,
  type GameState,
  type LocationState,
  PLAYERS,
  type PlayerIndex,
  type PlayerState,
  opponentOf,
} from './state.ts';

export interface PlayerSetup {
  id: string;
  deck: readonly string[];
}

export interface GameSetup {
  seed: string;
  players: readonly [PlayerSetup, PlayerSetup];
  // Pool the 3 locations are drawn from (default: every location). Exactly 3 ids = used as is, in that order.
  locations?: readonly string[];
}

export interface Transition {
  state: GameState;
  events: GameEvent[];
}

export function validateDeck(catalog: Catalog, deck: readonly string[]): string[] {
  const issues: string[] = [];
  if (deck.length !== DECK_SIZE) {
    issues.push(`a deck holds exactly ${DECK_SIZE} cards, got ${deck.length}`);
  }
  if (new Set(deck).size !== deck.length) {
    issues.push('a deck holds at most one copy of each card');
  }
  for (const id of deck) {
    if (!catalog.cards.has(id)) {
      issues.push(`unknown card ${id}`);
    }
  }
  return issues;
}

export function createGame(catalog: Catalog, setup: GameSetup): Transition {
  const runtime = Runtime.create(catalog, setup);
  return { state: runtime.state, events: runtime.events };
}

// Never mutates the given state: replaying the same actions from the same setup gives the same game.
export function applyAction(catalog: Catalog, state: GameState, action: GameAction): Transition {
  const runtime = new Runtime(catalog, structuredClone(state));
  runtime.dispatch(action);
  return { state: runtime.state, events: runtime.events };
}

export function powerOf(catalog: Catalog, state: GameState, card: string): number {
  return new Runtime(catalog, state).power(card);
}

export function locationPowers(catalog: Catalog, state: GameState): [number, number][] {
  return new Runtime(catalog, state).locationPowers();
}

export function remainingEnergy(state: GameState, player: PlayerIndex): number {
  const { energy, spent } = state.players[player];
  return energy - spent;
}

export function playableCards(catalog: Catalog, state: GameState, player: PlayerIndex): string[] {
  const left = remainingEnergy(state, player);
  return state.players[player].hand.filter((uid) => catalog.card(cardAt(state, uid).defId).cost <= left);
}

export function openLocations(state: GameState, player: PlayerIndex): number[] {
  return state.locations.flatMap((_, index) => (occupancy(state, player, index) < LOCATION_CAPACITY ? [index] : []));
}

function occupancy(state: GameState, player: PlayerIndex, location: number): number {
  const placed = state.locations[location]?.cards[player].length ?? 0;
  return placed + state.players[player].pending.filter((uid) => cardAt(state, uid).location === location).length;
}

function cardAt(state: GameState, uid: string): CardInstance {
  const card = state.cards[uid];
  if (card === undefined) {
    throw new RangeError(`Unknown card instance "${uid}"`);
  }
  return card;
}

class Runtime implements Board {
  readonly catalog: Catalog;
  readonly state: GameState;
  readonly rng: Rng;
  readonly events: GameEvent[] = [];

  constructor(catalog: Catalog, state: GameState) {
    this.catalog = catalog;
    this.state = state;
    this.rng = new Rng(state.rng);
  }

  static create(catalog: Catalog, setup: GameSetup): Runtime {
    const issues: string[] = [];
    const [first, second] = setup.players;
    if (first.id === '' || second.id === '' || first.id === second.id) {
      issues.push('two players with distinct, non-empty ids are required');
    }
    setup.players.forEach((player, index) => {
      issues.push(...validateDeck(catalog, player.deck).map((issue) => `player ${index}: ${issue}`));
    });
    const pool = [...new Set(setup.locations ?? catalog.locations.keys())];
    issues.push(...pool.filter((id) => !catalog.locations.has(id)).map((id) => `unknown location ${id}`));
    if (pool.length < LOCATION_COUNT) {
      issues.push(`at least ${LOCATION_COUNT} locations are required, got ${pool.length}`);
    }
    if (issues.length > 0) {
      throw new GameSetupError(issues);
    }

    const emptyPlayer = (id: string): PlayerState => ({ id, deck: [], hand: [], pending: [], energy: 0, spent: 0, ready: false });
    const runtime = new Runtime(catalog, {
      seed: setup.seed,
      rng: { s: seedFromString(setup.seed) },
      turn: 0,
      status: 'playing',
      players: [emptyPlayer(first.id), emptyPlayer(second.id)],
      locations: [],
      cards: {},
      nextPlayOrder: 0,
      result: null,
    });

    for (const player of PLAYERS) {
      // Instance ids are given after the shuffle so they say nothing about the deck list order.
      runtime.rng.shuffle([...setup.players[player].deck]).forEach((defId, index) => {
        const uid = `p${player}c${index + 1}`;
        runtime.state.cards[uid] = { uid, defId, owner: player, zone: 'deck', location: null, powerModifier: 0, playOrder: null };
        runtime.state.players[player].deck.push(uid);
      });
    }

    const picked = pool.length === LOCATION_COUNT ? pool : runtime.rng.shuffle(pool).slice(0, LOCATION_COUNT);
    runtime.state.locations = picked.map((defId): LocationState => ({ defId, revealed: false, cards: [[], []] }));

    for (const player of PLAYERS) {
      runtime.draw(player, STARTING_HAND);
    }
    runtime.startTurn(1);

    return runtime;
  }

  get turn(): number {
    return this.state.turn;
  }

  dispatch(action: GameAction): void {
    if (this.state.status === 'ended') {
      throw new IllegalActionError('gameOver', 'the game is over');
    }
    if (action.player !== 0 && action.player !== 1) {
      throw new IllegalActionError('unknownPlayer', `unknown player ${String(action.player)}`);
    }
    switch (action.type) {
      case 'play':
        return this.play(action.player, action.card, action.location);
      case 'cancel':
        return this.cancel(action.player, action.card);
      case 'endTurn':
        return this.endTurn(action.player);
    }
  }

  cardsMatching(source: AbilitySource, filter: CardFilter): string[] {
    const matches: string[] = [];
    this.state.locations.forEach((location, index) => {
      if ((filter.scope === 'here' && index !== source.location) || (filter.scope === 'elsewhere' && index === source.location)) {
        return;
      }
      for (const player of PLAYERS) {
        if (filter.side !== 'all') {
          if (source.owner === null || player !== (filter.side === 'ally' ? source.owner : opponentOf(source.owner))) {
            continue;
          }
        }
        for (const uid of location.cards[player]) {
          if (!filter.includeSelf && uid === source.card) {
            continue;
          }
          if (filter.tag !== undefined && !this.definitionOf(uid).tags.includes(filter.tag)) {
            continue;
          }
          matches.push(uid);
        }
      }
    });
    return matches;
  }

  power(uid: string): number {
    const card = cardAt(this.state, uid);
    let power = this.catalog.card(card.defId).power + card.powerModifier;
    if (card.zone !== 'board') {
      return power;
    }
    for (const { abilities, source } of this.ongoingSources()) {
      for (const ability of abilities) {
        if (ability.trigger !== 'ongoing' || !this.conditionMet(ability, source)) {
          continue;
        }
        if (ability.target.select(this, source).includes(uid)) {
          power += ability.effect.ongoingBonus?.(this, source) ?? 0;
        }
      }
    }
    return power;
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
    const slot = this.locationAt(card.location).cards[card.owner];
    slot.splice(slot.indexOf(uid), 1);
    card.zone = 'destroyed';
    this.events.push({ type: 'cardDestroyed', card: uid });
  }

  locationPowers(): [number, number][] {
    const sum = (uids: readonly string[]): number => uids.reduce((total, uid) => total + this.power(uid), 0);
    return this.state.locations.map((location): [number, number] => [sum(location.cards[0]), sum(location.cards[1])]);
  }

  private play(player: PlayerIndex, uid: string, location: number): void {
    const state = this.state.players[player];
    if (state.ready) {
      throw new IllegalActionError('playerReady', 'the turn is already ended for this player');
    }
    if (!state.hand.includes(uid)) {
      throw new IllegalActionError('cardNotInHand', `card ${uid} is not in hand`);
    }
    if (!Number.isInteger(location) || this.state.locations[location] === undefined) {
      throw new IllegalActionError('unknownLocation', `unknown location ${location}`);
    }
    const card = cardAt(this.state, uid);
    const cost = this.catalog.card(card.defId).cost;
    if (cost > state.energy - state.spent) {
      throw new IllegalActionError('notEnoughEnergy', `card ${uid} costs ${cost}, ${state.energy - state.spent} energy left`);
    }
    if (occupancy(this.state, player, location) >= LOCATION_CAPACITY) {
      throw new IllegalActionError('locationFull', `location ${location} is full`);
    }
    state.hand.splice(state.hand.indexOf(uid), 1);
    state.pending.push(uid);
    state.spent += cost;
    card.zone = 'pending';
    card.location = location;
    card.playOrder = this.state.nextPlayOrder++;
  }

  private cancel(player: PlayerIndex, uid: string): void {
    const state = this.state.players[player];
    if (state.ready) {
      throw new IllegalActionError('playerReady', 'the turn is already ended for this player');
    }
    if (!state.pending.includes(uid)) {
      throw new IllegalActionError('cardNotPending', `card ${uid} was not played this turn`);
    }
    const card = cardAt(this.state, uid);
    state.pending.splice(state.pending.indexOf(uid), 1);
    state.hand.push(uid);
    state.spent -= this.catalog.card(card.defId).cost;
    card.zone = 'hand';
    card.location = null;
    card.playOrder = null;
  }

  private endTurn(player: PlayerIndex): void {
    const state = this.state.players[player];
    if (state.ready) {
      throw new IllegalActionError('playerReady', 'the turn is already ended for this player');
    }
    state.ready = true;
    if (this.state.players.every((p) => p.ready)) {
      this.resolveTurn();
    }
  }

  private startTurn(turn: number): void {
    this.state.turn = turn;
    this.events.push({ type: 'turnStarted', turn });
    for (const player of PLAYERS) {
      const state = this.state.players[player];
      state.energy = Math.min(turn, MAX_TURNS);
      state.spent = 0;
      state.ready = false;
      this.draw(player, 1);
    }
    if (turn <= LOCATION_COUNT) {
      this.revealLocation(turn - 1);
    }
  }

  private revealLocation(index: number): void {
    const location = this.locationAt(index);
    location.revealed = true;
    this.events.push({ type: 'locationRevealed', location: index });
    this.runAbilities(this.catalog.location(location.defId).abilities, { owner: null, location: index, card: null }, 'onReveal');
  }

  private resolveTurn(): void {
    const first = this.priorityPlayer();
    this.events.push({ type: 'revealPriority', player: first });
    const order: PlayerIndex[] = [first, opponentOf(first)];

    for (const player of order) {
      const state = this.state.players[player];
      const pending = state.pending;
      state.pending = [];
      for (const uid of pending) {
        this.reveal(uid);
      }
    }

    this.state.locations.forEach((location, index) => {
      if (location.revealed) {
        this.runAbilities(this.catalog.location(location.defId).abilities, { owner: null, location: index, card: null }, 'endOfTurn');
      }
    });
    for (const player of order) {
      this.state.locations.forEach((location, index) => {
        for (const uid of [...location.cards[player]]) {
          this.runAbilities(this.definitionOf(uid).abilities, { owner: player, location: index, card: uid }, 'endOfTurn');
        }
      });
    }

    if (this.state.turn >= MAX_TURNS) {
      this.finish();
    } else {
      this.startTurn(this.state.turn + 1);
    }
  }

  private reveal(uid: string): void {
    const card = cardAt(this.state, uid);
    if (card.location === null) {
      throw new RangeError(`Pending card ${uid} has no location`);
    }
    card.zone = 'board';
    this.locationAt(card.location).cards[card.owner].push(uid);
    this.events.push({ type: 'cardRevealed', card: uid, player: card.owner, location: card.location });
    this.runAbilities(this.definitionOf(uid).abilities, { owner: card.owner, location: card.location, card: uid }, 'onReveal');
  }

  // The player winning more locations reveals first, then the one with more total power, then a coin flip.
  private priorityPlayer(): PlayerIndex {
    let lead = 0;
    let total = 0;
    for (const [a, b] of this.locationPowers()) {
      lead += Math.sign(a - b);
      total += a - b;
    }
    if (lead !== 0) {
      return lead > 0 ? 0 : 1;
    }
    if (total !== 0) {
      return total > 0 ? 0 : 1;
    }
    return this.rng.int(2) === 0 ? 0 : 1;
  }

  private finish(): void {
    const locationPowers = this.locationPowers();
    const locationWinners = locationPowers.map(([a, b]): PlayerIndex | null => (a === b ? null : a > b ? 0 : 1));
    const won = PLAYERS.map((player) => locationWinners.filter((winner) => winner === player).length);
    const totalPower: [number, number] = [0, 0];
    for (const [a, b] of locationPowers) {
      totalPower[0] += a;
      totalPower[1] += b;
    }
    let winner: PlayerIndex | null = null;
    if (won[0] !== won[1]) {
      winner = (won[0] ?? 0) > (won[1] ?? 0) ? 0 : 1;
    } else if (totalPower[0] !== totalPower[1]) {
      winner = totalPower[0] > totalPower[1] ? 0 : 1;
    }
    const result: GameResult = { winner, locationWinners, locationPowers, totalPower };
    this.state.status = 'ended';
    this.state.result = result;
    this.events.push({ type: 'gameEnded', result });
  }

  private runAbilities(abilities: readonly CompiledAbility[], source: AbilitySource, trigger: Trigger): void {
    for (const ability of abilities) {
      if (ability.trigger !== trigger) {
        continue;
      }
      // A card destroyed by one of its own abilities stops there.
      if (source.card !== null && cardAt(this.state, source.card).zone !== 'board') {
        return;
      }
      if (this.conditionMet(ability, source)) {
        ability.effect.apply(this, source, ability.target.select(this, source));
      }
    }
  }

  private conditionMet(ability: CompiledAbility, source: AbilitySource): boolean {
    return ability.condition === null || ability.condition.isMet(this, source);
  }

  private *ongoingSources(): Generator<{ abilities: readonly CompiledAbility[]; source: AbilitySource }> {
    for (const [index, location] of this.state.locations.entries()) {
      if (location.revealed) {
        yield { abilities: this.catalog.location(location.defId).abilities, source: { owner: null, location: index, card: null } };
      }
      for (const player of PLAYERS) {
        for (const uid of location.cards[player]) {
          yield { abilities: this.definitionOf(uid).abilities, source: { owner: player, location: index, card: uid } };
        }
      }
    }
  }

  private definitionOf(uid: string): CardDefinition {
    return this.catalog.card(cardAt(this.state, uid).defId);
  }

  private locationAt(index: number): LocationState {
    const location = this.state.locations[index];
    if (location === undefined) {
      throw new RangeError(`Unknown location ${index}`);
    }
    return location;
  }
}
