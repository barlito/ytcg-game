# packages/server

Authoritative Colyseus 0.18 server (`@colyseus/core` + `@colyseus/ws-transport` only — the `colyseus` meta-package pulls a GitHub-hosted uWebSockets build that fails without git).

## Layout

- `session/game-session.ts` — `GameSession`: one match between two seats, wrapping the engine. Pure (no network, no clock): seating, start, `apply(seat, input)`, `timeout()`, `forfeit()`, per-seat `messageFor()`. Test the rules of a match here.
- `room/duel-room.ts` — `DuelRoom` (abstract) + `defineDuelRoom(services)`: thin Colyseus glue. Private room, 2 seats, the game starts when the second player joins with the code (room id). Turn timer (`clock.setTimeout`), reconnection window on drop (`allowReconnection`), forfeit on leave. Services are bound by the factory, NEVER read from client options.
- `protocol.ts` — messages and zod schemas, shared with the client (`@ytcg-game/server/protocol`); `messages.ts` holds the room/message names without zod (`@ytcg-game/server/messages`, for the client's first chunk). The client never sends its player index: the server derives it from the authenticated identity.
- Join options: production = `deckRefOptionsSchema` `{ deckId }` (STRICT object: an inline deck or a name is refused); development = `devJoinOptionsSchema` `{ name?, deck: { cards, location? } }`. Each provider parses its own schema, so the production server never accepts an inline deck.
- `auth/` — `Authenticator` interface; `JwtAuthenticator` (ytcg `jwt` cookie, verified with the ytcg public key through jose) and `DevAuthenticator` (player picks a name).
- `decks/` — `DeckProvider` interface + `DeckError` (French message shown to the player as is).
  - `YtcgDeckProvider` (production): `{ deckId }` → `YtcgDeckApi` calls `GET <YTCG_API_URL>/api/duel/server/decks/{id}?player=<discordId>` with `Authorization: Bearer <DUEL_SERVER_TOKEN>` (3 s timeout, injectable `fetch`), ytcg checks ownership NOW; `terrain` → `location` (absent when null). 409 → « Deck incomplet : N cartes manquent… », 404 → « Deck introuvable », network/timeout/401/5xx/unreadable → « Youl TCG est indisponible, réessaie. » (401 = token mismatch, logged). Contract: `../youl-tcg/docs/duel-api.md`.
  - `game-rules.ts` (`gameRuleRefusal` / `assertGameRules`): the game's own rules ytcg does not check — every card in the game catalog, 12 distinct cards, known terrain, cost curve (engine `deckCurveChecks`, French text `describeCurveRule`). Exported as `@ytcg-game/server/deck-rules`: the client shows the very refusal the server would give.
  - `CatalogDeckProvider` (development only): inline deck checked against the catalog, no ownership.
- `main.ts` (production: JWT + ytcg decks) / `dev.ts` (development: names + inline decks) — the ONLY places choosing implementations (`roomServices({ catalog, authenticator, decks }, config)`); no bypass flag in production code.

## Rules

- Reading pause: a turn following a resolution gets `scheduleTurn()` (`session/turn-clock.ts`): `revealUntil` = now + pause, deadline = now + pause + turn; the room timer is armed for the whole span, so the timeout never fires before the announced deadline.
- Never re-implement a rule here: the engine decides, the session wraps, the room relays.
- Send `projectForPlayer()` + `projectEventsForPlayer()` per client, never the raw `GameState` (both decks in order, RNG state).
- Config from env (`config.ts`): `PORT`, `TURN_SECONDS` (60), `REVEAL_PAUSE_SECONDS` (5), `RECONNECT_SECONDS` (30), `YTCG_JWT_PUBLIC_KEY_PATH`, `YTCG_JWT_ALGORITHM` (RS256), `YTCG_API_URL` (ytcg origin reachable from the server, http(s)), `DUEL_SERVER_TOKEN` (secret shared with ytcg). `readProductionConfig()` (main.ts) refuses to boot without the key path, the API URL and the token.
- Tests: `tests/decks.test.ts` (providers with a mocked `fetch`, production config), `tests/session.test.ts` (pure), `tests/auth.test.ts` (keys generated per run), `tests/room.test.ts` (`@colyseus/testing` boots a real server; every state change is broadcast to BOTH players, so wait for the message matching what you expect).
