# packages/server

Authoritative Colyseus server (phase 2). Not started yet.

- Thin wrapper around `packages/engine`: messages from clients become engine actions, the engine decides. Never re-implement a rule here.
- No database. Players, ownership and decks come from ytcg; game data comes from `data/`.
- `onAuth` verifies the ytcg JWT cookie with the ytcg public key (same domain behind Traefik, path prefix).
- At join, fetch the deck from ytcg validated against ownership at that moment.
- Per-player state filtering: the opponent hand is only a count, unrevealed cards are never synced to the other client.
- Sync `projectForPlayer()` (engine) per client, never the raw `GameState`: it holds both decks in order and the RNG state. Engine events also leak hidden data (`cardDrawn` carries the uid) and must be filtered per player before being sent.
