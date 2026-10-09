import { type AuthContext, type Client, Room } from '@colyseus/core';
import { type Catalog, type GameEvent, IllegalActionError, type PlayerIndex } from '@ytcg-game/engine';
import type { Authenticator } from '../auth/authenticator.ts';
import type { DeckProvider } from '../decks/deck-provider.ts';
import type { PlayerIdentity } from '../identity.ts';
import {
  type ActionInput,
  type DeckChoice,
  type ErrorMessage,
  type GameMessage,
  type LobbyMessage,
  MESSAGE_ACTION,
  MESSAGE_ERROR,
  MESSAGE_GAME,
  MESSAGE_LOBBY,
  actionInputSchema,
} from '../protocol.ts';
import { GameSession, SessionError } from '../session/game-session.ts';
import { RoomCodes } from './room-code.ts';
import { type TurnSchedule, type TurnTiming, revealCount, scheduleTurn } from '../session/turn-clock.ts';

export interface RoomServices extends TurnTiming {
  catalog: Catalog;
  authenticator: Authenticator;
  decks: DeckProvider;
  reconnectSeconds: number;
  newSeed(): string;
  now(): number;
}

interface SeatAuth {
  identity: PlayerIdentity;
  deck: DeckChoice;
}

type DuelClient = Client<{
  auth: SeatAuth;
  messages: { [MESSAGE_LOBBY]: LobbyMessage; [MESSAGE_GAME]: GameMessage; [MESSAGE_ERROR]: ErrorMessage };
}>;

type Timer = ReturnType<Room['clock']['setTimeout']>;

// Services are bound by defineDuelRoom(), never read from client options.
export function defineDuelRoom(services: RoomServices): new () => DuelRoom {
  const codes = new RoomCodes();
  return class extends DuelRoom {
    protected readonly services = services;
    protected readonly codes = codes;
  };
}

export abstract class DuelRoom extends Room<{ client: DuelClient }> {
  override maxClients = 2;
  protected abstract readonly services: RoomServices;
  protected abstract readonly codes: RoomCodes;
  private session!: GameSession;
  private turnTimer: Timer | null = null;
  private schedule: TurnSchedule | null = null;

  override onCreate(): void {
    // The friend code is the room id: Colyseus lets onCreate replace it before the room is recorded.
    this.roomId = this.codes.allocate();
    this.session = new GameSession(this.services.catalog, this.services.newSeed());
    void this.setPrivate(true);
    this.onMessage(MESSAGE_ACTION, actionInputSchema, (client: DuelClient, input: ActionInput) => {
      this.handleAction(client, input);
    });
  }

  override async onAuth(_client: DuelClient, options: unknown, context: AuthContext): Promise<SeatAuth> {
    const identity = await this.services.authenticator.authenticate(context, options);
    if (this.session.seatOf(identity.id) !== null) {
      throw new SessionError('alreadySeated', `${identity.name} est déjà dans cette partie.`);
    }
    return { identity, deck: await this.services.decks.deckFor(identity, options) };
  }

  override onJoin(client: DuelClient): void {
    const { identity, deck } = this.authOf(client);
    this.session.seat(identity, deck);
    if (!this.session.isFull) {
      this.broadcast(MESSAGE_LOBBY, this.session.lobby());
      return;
    }
    void this.lock();
    const events = this.session.start();
    this.restartTurnTimer(null);
    this.sendGame(events);
  }

  override onDrop(client: DuelClient): void {
    if (!this.session.isStarted || this.session.isOver) {
      return;
    }
    this.session.setConnected(this.seatOf(client), false);
    this.sendGame([]);
    void this.allowReconnection(client, this.services.reconnectSeconds);
  }

  override onReconnect(client: DuelClient): void {
    this.session.setConnected(this.seatOf(client), true);
    this.sendGame([]);
  }

  // A player gone for good during the game forfeits it.
  override onLeave(client: DuelClient): void {
    if (!this.session.isStarted || this.session.isOver) {
      return;
    }
    this.session.forfeit(this.seatOf(client));
    this.stopTurnTimer();
    this.sendGame([]);
  }

  override onDispose(): void {
    this.codes.release(this.roomId);
    this.stopTurnTimer();
  }

  private handleAction(client: DuelClient, input: ActionInput): void {
    try {
      const turn = this.session.turn;
      this.afterChange(this.session.apply(this.seatOf(client), input), turn);
    } catch (error) {
      if (error instanceof IllegalActionError || error instanceof SessionError) {
        client.send(MESSAGE_ERROR, { code: error.code, message: error.message });
        return;
      }
      throw error;
    }
  }

  private onTurnTimeout(): void {
    const turn = this.session.turn;
    this.afterChange(this.session.timeout(), turn);
  }

  private afterChange(events: GameEvent[], turnBefore: number): void {
    if (this.session.isOver) {
      this.stopTurnTimer();
    } else if (this.session.turn !== turnBefore) {
      this.restartTurnTimer(revealCount(events));
    }
    this.sendGame(events);
  }

  private sendGame(events: readonly GameEvent[]): void {
    for (const client of this.clients) {
      const message = this.session.messageFor(this.seatOf(client), events, this.schedule);
      client.send(MESSAGE_GAME, { ...message, serverTime: this.services.now() });
    }
  }

  // The timer covers the reading pause too: it never fires before the announced deadline.
  // reveals: cards and terrains revealed by the resolution that led to this turn (null for the first turn).
  private restartTurnTimer(reveals: number | null): void {
    this.stopTurnTimer();
    const now = this.services.now();
    const schedule = scheduleTurn(now, this.services, reveals);
    this.schedule = schedule;
    this.turnTimer = this.clock.setTimeout(() => {
      this.onTurnTimeout();
    }, schedule.deadline - now);
  }

  private stopTurnTimer(): void {
    this.turnTimer?.clear();
    this.turnTimer = null;
    this.schedule = null;
  }

  private authOf(client: DuelClient): SeatAuth {
    if (client.auth === undefined) {
      throw new SessionError('notStarted', 'unauthenticated client');
    }
    return client.auth;
  }

  private seatOf(client: DuelClient): PlayerIndex {
    const seat = this.session.seatOf(this.authOf(client).identity.id);
    if (seat === null) {
      throw new SessionError('notStarted', 'this client has no seat');
    }
    return seat;
  }
}
