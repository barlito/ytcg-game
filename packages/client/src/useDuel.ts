import { Client, type Room } from '@colyseus/sdk';
import type { ActionInput, ErrorMessage, GameMessage, JoinOptions, LobbyMessage } from '@ytcg-game/server/protocol';
import { MESSAGE_ACTION, MESSAGE_ERROR, MESSAGE_GAME, MESSAGE_LOBBY, ROOM_NAME } from '@ytcg-game/server/messages';
import { actionErrorText } from './errors.ts';
import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

export type DuelPhase =
  | { kind: 'home' }
  | { kind: 'connecting' }
  | { kind: 'lobby'; code: string; lobby: LobbyMessage }
  | { kind: 'game'; code: string; game: GameMessage };

export interface Duel {
  phase: DuelPhase;
  error: string | null;
  create: (options: JoinOptions) => void;
  join: (code: string, options: JoinOptions) => void;
  send: (input: ActionInput) => void;
  leave: () => void;
}

type SetPhase = Dispatch<SetStateAction<DuelPhase>>;

function listen(joined: Room, setPhase: SetPhase, setError: (error: string | null) => void): void {
  joined.onMessage(MESSAGE_LOBBY, (lobby: LobbyMessage) => {
    setPhase({ kind: 'lobby', code: joined.roomId, lobby });
  });
  joined.onMessage(MESSAGE_GAME, (game: GameMessage) => {
    setPhase({ kind: 'game', code: joined.roomId, game });
    setError(null);
  });
  joined.onMessage(MESSAGE_ERROR, (message: ErrorMessage) => {
    setError(actionErrorText(message.code, message.message));
  });
  joined.onLeave(() => {
    sessionStorage.removeItem(RECONNECT_KEY);
  });
}

// A refreshed page goes back into its game (once: StrictMode runs effects twice in development).
function useReconnectOnLoad(client: Client, attach: (room: Room) => void): void {
  const reconnecting = useRef(false);
  useEffect(() => {
    const token = sessionStorage.getItem(RECONNECT_KEY);
    if (token !== null && !reconnecting.current) {
      reconnecting.current = true;
      client.reconnect(token).then(attach, () => {
        sessionStorage.removeItem(RECONNECT_KEY);
      });
    }
  }, [client, attach]);
}

const RECONNECT_KEY = 'ytcg-game:reconnect';

function endpoint(): string {
  const configured: unknown = import.meta.env.VITE_SERVER_URL;
  if (typeof configured === 'string' && configured !== '') {
    return configured;
  }
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:2567`;
}

export function useDuel(): Duel {
  const [client] = useState(() => new Client(endpoint()));
  const room = useRef<Room | null>(null);
  const [phase, setPhase] = useState<DuelPhase>({ kind: 'home' });
  const [error, setError] = useState<string | null>(null);

  const attach = useCallback((joined: Room) => {
    room.current = joined;
    sessionStorage.setItem(RECONNECT_KEY, joined.reconnectionToken);
    listen(joined, setPhase, setError);
    setPhase((current) =>
      current.kind === 'connecting' ? { kind: 'lobby', code: joined.roomId, lobby: { seats: [] } } : current,
    );
  }, []);

  const connect = useCallback(
    (open: () => Promise<Room>) => {
      setPhase({ kind: 'connecting' });
      setError(null);
      open().then(attach, (reason: unknown) => {
        setPhase({ kind: 'home' });
        setError(reason instanceof Error ? reason.message : 'connexion impossible');
      });
    },
    [attach],
  );

  useReconnectOnLoad(client, attach);

  return {
    phase,
    error,
    create: (options) => {
      connect(() => client.create(ROOM_NAME, options));
    },
    join: (code, options) => {
      connect(() => client.joinById(code.trim(), options));
    },
    send: (input) => {
      room.current?.send(MESSAGE_ACTION, input);
    },
    leave: () => {
      void room.current?.leave(true);
      room.current = null;
      sessionStorage.removeItem(RECONNECT_KEY);
      setPhase({ kind: 'home' });
    },
  };
}
