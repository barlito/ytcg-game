import { randomUUID } from 'node:crypto';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import type { Catalog } from '@ytcg-game/engine';
import type { Authenticator } from './auth/authenticator.ts';
import type { ServerConfig } from './config.ts';
import { CatalogDeckProvider } from './decks/deck-provider.ts';
import { ROOM_NAME } from './protocol.ts';
import { type RoomServices, defineDuelRoom } from './room/duel-room.ts';

export function roomServices(catalog: Catalog, authenticator: Authenticator, config: ServerConfig): RoomServices {
  return {
    catalog,
    authenticator,
    decks: new CatalogDeckProvider(catalog),
    turnSeconds: config.TURN_SECONDS,
    revealPauseSeconds: config.REVEAL_PAUSE_SECONDS,
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
