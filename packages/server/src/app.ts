import { randomUUID } from 'node:crypto';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import type { Catalog } from '@ytcg-game/engine';
import type { Authenticator } from './auth/authenticator.ts';
import type { ServerConfig } from './config.ts';
import type { DeckProvider } from './decks/deck-provider.ts';
import { ROOM_NAME } from './protocol.ts';
import { type RoomServices, defineDuelRoom } from './room/duel-room.ts';

// The implementations are chosen by the entry points only (src/main.ts, src/dev.ts).
export interface Implementations {
  catalog: Catalog;
  authenticator: Authenticator;
  decks: DeckProvider;
}

export function roomServices(implementations: Implementations, config: ServerConfig): RoomServices {
  return {
    ...implementations,
    turnSeconds: config.TURN_SECONDS,
    revealPauseSeconds: config.REVEAL_PAUSE_SECONDS,
    revealSecondsPerCard: config.REVEAL_SECONDS_PER_CARD,
    revealPauseMaxSeconds: config.REVEAL_PAUSE_MAX_SECONDS,
    reconnectSeconds: config.RECONNECT_SECONDS,
    newSeed: () => randomUUID(),
    now: () => Date.now(),
  };
}

export function createGameServer(services: RoomServices): Server {
  const server = new Server({ transport: new WebSocketTransport() });
  server.define(ROOM_NAME, defineDuelRoom(services));
  return server;
}
