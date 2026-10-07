import { LOCATION_COUNT, MAX_TURNS } from '../rules.ts';
import { type GameEvent, type GameResult, PLAYERS, type PlayerIndex, opponentOf } from '../state.ts';
import type { AbilityRunner } from './abilities.ts';
import type { GameBoard } from './board.ts';
import { cardAt, locationAt } from './state-access.ts';

// Turn lifecycle: start (energy, draw, location reveal), resolution (reveals, end of turn), end of game.
export class TurnFlow {
  private readonly board: GameBoard;
  private readonly abilities: AbilityRunner;
  private readonly events: GameEvent[];

  constructor(board: GameBoard, abilities: AbilityRunner, events: GameEvent[]) {
    this.board = board;
    this.abilities = abilities;
    this.events = events;
  }

  start(turn: number): void {
    const { state } = this.board;
    state.turn = turn;
    this.events.push({ type: 'turnStarted', turn });
    for (const player of PLAYERS) {
      const playerState = state.players[player];
      playerState.energy = Math.min(turn, MAX_TURNS);
      playerState.spent = 0;
      playerState.ready = false;
      this.board.draw(player, 1);
    }
    if (turn <= LOCATION_COUNT) {
      this.revealLocation(turn - 1);
    }
  }

  // Called once both players ended their turn.
  resolve(): void {
    const first = this.priorityPlayer();
    this.events.push({ type: 'revealPriority', player: first });
    const order: PlayerIndex[] = [first, opponentOf(first)];

    for (const player of order) {
      const playerState = this.board.state.players[player];
      const pending = playerState.pending;
      playerState.pending = [];
      pending.forEach((uid) => {
        this.reveal(uid);
      });
    }
    this.endOfTurn(order);

    if (this.board.state.turn >= MAX_TURNS) {
      this.finish();
    } else {
      this.start(this.board.state.turn + 1);
    }
  }

  private revealLocation(index: number): void {
    locationAt(this.board.state, index).revealed = true;
    this.events.push({ type: 'locationRevealed', location: index });
    this.abilities.fireLocation(index, 'onReveal');
  }

  private reveal(uid: string): void {
    const card = cardAt(this.board.state, uid);
    if (card.location === null) {
      throw new RangeError(`Pending card ${uid} has no location`);
    }
    card.zone = 'board';
    locationAt(this.board.state, card.location).cards[card.owner].push(uid);
    this.events.push({ type: 'cardRevealed', card: uid, player: card.owner, location: card.location });
    this.abilities.fireCard(uid, 'onReveal');
  }

  // Locations first (left to right), then the cards in reveal priority order.
  private endOfTurn(order: readonly PlayerIndex[]): void {
    const { locations } = this.board.state;
    locations.forEach((_, index) => {
      this.abilities.fireLocation(index, 'endOfTurn');
    });
    for (const player of order) {
      for (const location of locations) {
        for (const uid of [...location.cards[player]]) {
          this.abilities.fireCard(uid, 'endOfTurn');
        }
      }
    }
  }

  // The player winning more locations reveals first, then the one with more total power, then a coin flip.
  private priorityPlayer(): PlayerIndex {
    let lead = 0;
    let total = 0;
    for (const [a, b] of this.board.locationPowers()) {
      lead += Math.sign(a - b);
      total += a - b;
    }
    if (lead !== 0) {
      return lead > 0 ? 0 : 1;
    }
    if (total !== 0) {
      return total > 0 ? 0 : 1;
    }
    return this.board.rng.int(2) === 0 ? 0 : 1;
  }

  private finish(): void {
    const result = computeResult(this.board.locationPowers());
    this.board.state.status = 'ended';
    this.board.state.result = result;
    this.events.push({ type: 'gameEnded', result });
  }
}

// 2 locations out of 3 win; a tie on locations goes to the total power, otherwise a draw.
export function computeResult(locationPowers: [number, number][]): GameResult {
  const locationWinners = locationPowers.map(([a, b]): PlayerIndex | null => (a === b ? null : a > b ? 0 : 1));
  const totalPower: [number, number] = [0, 0];
  for (const [a, b] of locationPowers) {
    totalPower[0] += a;
    totalPower[1] += b;
  }
  const lead = locationWinners.reduce((sum: number, winner) => sum + (winner === null ? 0 : winner === 0 ? 1 : -1), 0);
  const margin = lead !== 0 ? lead : totalPower[0] - totalPower[1];
  const winner: PlayerIndex | null = margin === 0 ? null : margin > 0 ? 0 : 1;
  return { winner, locationWinners, locationPowers, totalPower };
}
