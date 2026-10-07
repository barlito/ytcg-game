# packages/server

Authoritative Colyseus 0.18 server (`@colyseus/core` + `@colyseus/ws-transport` only — the `colyseus` meta-package pulls a GitHub-hosted uWebSockets build that fails without git).

## Layout

- `session/game-session.ts` — `GameSession`: one match between two seats, wrapping the engine. Pure (no network, no clock): seating, start, `apply(seat, input)`, `timeout()`, `forfeit()`, per-seat `messageFor()`. Test the rules of a match here.
- `room/duel-room.ts` — `DuelRoom` (abstract) + `defineDuelRoom(services)`: thin Colyseus glue. Private room, 2 seats, the game starts when the second player joins with the code (room id). Turn timer (`clock.setTimeout`), reconnection window on drop (`allowReconnection`), forfeit on leave. Services are bound by the factory, NEVER read from client options.
- `protocol.ts` — messages and zod schemas, shared with the client (`@ytcg-game/server/protocol`). The client never sends its player index: the server derives it from the authenticated identity.
- `auth/` — `Authenticator` interface; `JwtAuthenticator` (ytcg `jwt` cookie, verified with the ytcg public key through jose) and `DevAuthenticator` (player picks a name).
- `decks/` — `DeckProvider` interface; `CatalogDeckProvider` (deck sent by the client, checked against the catalog only) until ytcg stores decks (phase 3: `YtcgDeckProvider`).
- `main.ts` (production, JWT) / `dev.ts` (development, names) — the ONLY places choosing implementations; no bypass flag in production code.

## Rules

- Never re-implement a rule here: the engine decides, the session wraps, the room relays.
- Send `projectForPlayer()` + `projectEventsForPlayer()` per client, never the raw `GameState` (both decks in order, RNG state).
- Config from env (`config.ts`): `PORT`, `TURN_SECONDS` (60), `RECONNECT_SECONDS` (30), `YTCG_JWT_PUBLIC_KEY_PATH`, `YTCG_JWT_ALGORITHM` (RS256).
- Tests: `tests/session.test.ts` (pure), `tests/auth.test.ts` (keys generated per run), `tests/room.test.ts` (`@colyseus/testing` boots a real server; every state change is broadcast to BOTH players, so wait for the message matching what you expect).
