import { type AuthContext, type Client, Room } from '@colyseus/core';
import { type Catalog, type GameEvent, IllegalActionError, type PlayerIndex } from '@ytcg-game/engine';
import type { Authenticator } from '../auth/authenticator.ts';
import type { DeckProvider } from '../decks/deck-provider.ts';
import type { PlayerIdentity } from '../identity.ts';
import {
  type ActionInput,
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

export interface RoomServices {
  catalog: Catalog;
  authenticator: Authenticator;
  decks: DeckProvider;
  turnSeconds: number;
  reconnectSeconds: number;
  newSeed(): string;
  now(): number;
}

interface SeatAuth {
  identity: PlayerIdentity;
  deck: string[];
}

type DuelClient = Client<{
  auth: SeatAuth;
  messages: { [MESSAGE_LOBBY]: LobbyMessage; [MESSAGE_GAME]: GameMessage; [MESSAGE_ERROR]: ErrorMessage };
}>;

type Timer = ReturnType<Room['clock']['setTimeout']>;

// Services are bound by defineDuelRoom(), never read from client options.
export function defineDuelRoom(services: RoomServices): new () => DuelRoom {
  return class extends DuelRoom {
    protected readonly services = services;
  };
}

export abstract class DuelRoom extends Room<{ client: DuelClient }> {
  override maxClients = 2;
  protected abstract readonly services: RoomServices;
  private session!: GameSession;
  private turnTimer: Timer | null = null;
  private turnDeadline: number | null = null;

  override onCreate(): void {
    this.session = new GameSession(this.services.catalog, this.services.newSeed());
    void this.setPrivate(true);
    this.onMessage(MESSAGE_ACTION, actionInputSchema, (client: DuelClient, input: ActionInput) => {
      this.handleAction(client, input);
    });
  }

  override async onAuth(_client: DuelClient, options: unknown, context: AuthContext): Promise<SeatAuth> {
    const identity = await this.services.authenticator.authenticate(context, options);
    if (this.session.seatOf(identity.id) !== null) {
      throw new SessionError('alreadySeated', `${identity.name} is already in this game`);
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
    this.restartTurnTimer();
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
      this.restartTurnTimer();
    }
    this.sendGame(events);
  }

  private sendGame(events: readonly GameEvent[]): void {
    for (const client of this.clients) {
      client.send(MESSAGE_GAME, this.session.messageFor(this.seatOf(client), events, this.turnDeadline));
    }
  }

  private restartTurnTimer(): void {
    this.stopTurnTimer();
    const milliseconds = this.services.turnSeconds * 1000;
    this.turnDeadline = this.services.now() + milliseconds;
    this.turnTimer = this.clock.setTimeout(() => {
      this.onTurnTimeout();
    }, milliseconds);
  }

  private stopTurnTimer(): void {
    this.turnTimer?.clear();
    this.turnTimer = null;
    this.turnDeadline = null;
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
