import { type ColyseusTestServer, boot } from '@colyseus/testing';
import type { Room } from '@colyseus/sdk';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createGameServer } from '../src/app.ts';
import { DevAuthenticator } from '../src/auth/dev-authenticator.ts';
import { CatalogDeckProvider } from '../src/decks/deck-provider.ts';
import {
  type GameMessage,
  type LobbyMessage,
  MESSAGE_ACTION,
  MESSAGE_GAME,
  MESSAGE_LOBBY,
  ROOM_NAME,
} from '../src/protocol.ts';
import { catalog, randomDeck } from './support.ts';

let colyseus: ColyseusTestServer;
const clock = 1_000_000;

beforeAll(async () => {
  const server = createGameServer({
    catalog,
    authenticator: new DevAuthenticator(),
    decks: new CatalogDeckProvider(catalog),
    turnSeconds: 1,
    reconnectSeconds: 0,
    newSeed: () => 'room-test',
    now: () => clock,
  });
  colyseus = await boot(server, 2599);
});

afterEach(async () => {
  await colyseus.cleanup();
});

afterAll(async () => {
  await colyseus.shutdown();
});

// The next message of that type matching the predicate (every state change is broadcast to both players).
function nextMessage<T>(room: Room, type: string, accept: (payload: T) => boolean = () => true): Promise<T> {
  return new Promise((resolve) => {
    const unbind = room.onMessage(type, (payload: T) => {
      if (accept(payload)) {
        unbind();
        resolve(payload);
      }
    });
  });
}

async function startDuel(): Promise<{ alice: Room; bob: Room; first: [GameMessage, GameMessage] }> {
  const alice = await colyseus.sdk.create(ROOM_NAME, { name: 'Alice', deck: randomDeck(1) });
  const aliceGame = nextMessage<GameMessage>(alice, MESSAGE_GAME);
  const bob = await colyseus.sdk.joinById(alice.roomId, { name: 'Bob', deck: randomDeck(2) });
  const bobGame = nextMessage<GameMessage>(bob, MESSAGE_GAME);
  return { alice, bob, first: [await aliceGame, await bobGame] };
}

describe('duel room', () => {
  it('waits in a lobby, then starts when a friend joins with the code', async () => {
    const alice = await colyseus.sdk.create(ROOM_NAME, { name: 'Alice', deck: randomDeck(1) });
    const lobby = await nextMessage<LobbyMessage>(alice, MESSAGE_LOBBY);
    expect(lobby.seats.map((seat) => seat.name)).toEqual(['Alice']);

    const aliceGame = nextMessage<GameMessage>(alice, MESSAGE_GAME);
    await colyseus.sdk.joinById(alice.roomId, { name: 'Bob', deck: randomDeck(2) });
    const game = await aliceGame;
    expect(game.view.you).toBe(0);
    expect(game.view.turn).toBe(1);
    expect(game.seats.map((seat) => seat.name)).toEqual(['Alice', 'Bob']);
    expect(game.turnDeadline).toBe(clock + 1000);
  });

  it('refuses a join without a legal deck and a third player', async () => {
    const [location] = catalog.locations.keys();
    await expect(
      colyseus.sdk.create(ROOM_NAME, { name: 'Alice', deck: { cards: ['nope'], location } }),
    ).rejects.toThrow();
    const { alice } = await startDuel();
    await expect(colyseus.sdk.joinById(alice.roomId, { name: 'Carol', deck: randomDeck(3) })).rejects.toThrow();
  });

  it('applies actions for the sender and resolves the turn when both ended', async () => {
    const { alice, bob } = await startDuel();
    const aliceUpdate = nextMessage<GameMessage>(alice, MESSAGE_GAME);
    alice.send(MESSAGE_ACTION, { type: 'endTurn' });
    expect((await aliceUpdate).view.ready).toBe(true);

    const nextTurn = nextMessage<GameMessage>(bob, MESSAGE_GAME, (update) => update.view.turn === 2);
    bob.send(MESSAGE_ACTION, { type: 'endTurn' });
    const message = await nextTurn;
    expect(message.view.turn).toBe(2);
    expect(message.events.some((event) => event.type === 'turnStarted')).toBe(true);
  });

  it('answers an illegal action with an error, to the sender only', async () => {
    const { alice } = await startDuel();
    const error = nextMessage<{ code: string }>(alice, 'error');
    alice.send(MESSAGE_ACTION, { type: 'play', card: 'p1c1', location: 0 });
    expect((await error).code).toBe('cardNotInHand');
  });

  it('ends the turn of an idle player when the timer elapses', async () => {
    const { bob } = await startDuel();
    const afterTimeout = nextMessage<GameMessage>(bob, MESSAGE_GAME);
    expect((await afterTimeout).view.turn).toBe(2);
  });

  it('gives the win to the player who stays when the other leaves', async () => {
    const { alice, bob } = await startDuel();
    const ended = nextMessage<GameMessage>(bob, MESSAGE_GAME);
    await alice.leave(true);
    expect((await ended).outcome).toEqual({ winner: 1, reason: 'forfeit' });
  });
});
