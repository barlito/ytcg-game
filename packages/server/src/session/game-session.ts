import {
  type Catalog,
  type GameEvent,
  type GameState,
  PLAYERS,
  type PlayerIndex,
  applyAction,
  createGame,
  gameActionSchema,
  opponentOf,
  projectEventsForPlayer,
  projectForPlayer,
} from '@ytcg-game/engine';
import type { PlayerIdentity } from '../identity.ts';
import type { ActionInput, DeckChoice, GameMessage, LobbyMessage, Outcome, SeatInfo } from '../protocol.ts';

export type SessionErrorCode = 'roomFull' | 'alreadySeated' | 'notStarted' | 'gameOver';

export class SessionError extends Error {
  readonly code: SessionErrorCode;

  constructor(code: SessionErrorCode, message: string) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
  }
}

interface Seat {
  identity: PlayerIdentity;
  deck: DeckChoice;
  connected: boolean;
}

// One match between two seated players, wrapping the engine. No network, no clock: the room drives it.
export class GameSession {
  private readonly catalog: Catalog;
  private readonly seed: string;
  private readonly seats: Seat[] = [];
  private state: GameState | null = null;
  private forfeited: PlayerIndex | null = null;

  constructor(catalog: Catalog, seed: string) {
    this.catalog = catalog;
    this.seed = seed;
  }

  get isFull(): boolean {
    return this.seats.length === PLAYERS.length;
  }

  get isStarted(): boolean {
    return this.state !== null;
  }

  get isOver(): boolean {
    return this.outcome() !== null;
  }

  get turn(): number {
    return this.state?.turn ?? 0;
  }

  seatOf(playerId: string): PlayerIndex | null {
    const index = this.seats.findIndex((seat) => seat.identity.id === playerId);
    return index === 0 || index === 1 ? index : null;
  }

  // The first two distinct players get seats 0 and 1.
  seat(identity: PlayerIdentity, deck: DeckChoice): PlayerIndex {
    if (this.seatOf(identity.id) !== null) {
      throw new SessionError('alreadySeated', `${identity.name} est déjà dans cette partie.`);
    }
    if (this.isFull) {
      throw new SessionError('roomFull', 'Cette partie a déjà deux joueurs.');
    }
    this.seats.push({ identity, deck, connected: true });
    return this.seats.length === 1 ? 0 : 1;
  }

  setConnected(player: PlayerIndex, connected: boolean): void {
    const seat = this.seats[player];
    if (seat !== undefined) {
      seat.connected = connected;
    }
  }

  start(): GameEvent[] {
    const [first, second] = this.seats;
    if (first === undefined || second === undefined) {
      throw new SessionError('notStarted', 'Il faut deux joueurs pour commencer.');
    }
    const { state, events } = createGame(this.catalog, {
      seed: this.seed,
      players: [
        { id: first.identity.id, deck: first.deck.cards, location: first.deck.location },
        { id: second.identity.id, deck: second.deck.cards, location: second.deck.location },
      ],
    });
    this.state = state;
    return events;
  }

  // Throws IllegalActionError when the engine refuses the action.
  apply(player: PlayerIndex, input: ActionInput): GameEvent[] {
    const action = gameActionSchema.parse({ ...input, player });
    const { state, events } = applyAction(this.catalog, this.runningState(), action);
    this.state = state;
    return events;
  }

  // Turn timer elapsed: every player still planning ends their turn as is.
  timeout(): GameEvent[] {
    const events: GameEvent[] = [];
    const startedTurn = this.turn;
    for (const player of PLAYERS) {
      const state = this.runningState();
      if (state.turn === startedTurn && !state.players[player].ready) {
        events.push(...this.apply(player, { type: 'endTurn' }));
      }
    }
    return events;
  }

  forfeit(player: PlayerIndex): void {
    if (this.isStarted && !this.isOver) {
      this.forfeited = player;
    }
  }

  outcome(): Outcome | null {
    if (this.forfeited !== null) {
      return { winner: opponentOf(this.forfeited), reason: 'forfeit' };
    }
    const result = this.state?.result ?? null;
    return result === null ? null : { winner: result.winner, reason: 'score' };
  }

  lobby(): LobbyMessage {
    return { seats: this.seatInfos() };
  }

  messageFor(player: PlayerIndex, events: readonly GameEvent[], turnDeadline: number | null): GameMessage {
    return {
      seats: this.seatInfos(),
      view: projectForPlayer(this.catalog, this.startedState(), player),
      events: projectEventsForPlayer(events, player),
      turnDeadline: this.isOver ? null : turnDeadline,
      outcome: this.outcome(),
    };
  }

  private seatInfos(): SeatInfo[] {
    return this.seats.map((seat) => ({ name: seat.identity.name, connected: seat.connected }));
  }

  private startedState(): GameState {
    if (this.state === null) {
      throw new SessionError('notStarted', "La partie n'a pas commencé.");
    }
    return this.state;
  }

  // The state actions may still change: started and not forfeited.
  private runningState(): GameState {
    if (this.forfeited !== null) {
      throw new SessionError('gameOver', 'La partie est terminée.');
    }
    return this.startedState();
  }
}
