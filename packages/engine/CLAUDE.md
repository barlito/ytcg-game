# packages/engine

Pure game rules. Imported by the server (authoritative) and the client (types, previews).

- No I/O, no network, no Colyseus, no timers, no `Math.random()`: every random draw goes through the seeded RNG held in the game state, so a seed + the action list replays a match exactly.
- Abilities = trigger + optional condition + effect + target. Each kind is a class registered in its registry; card/location JSON only carries `type` + params, validated by a schema at load time (an unknown type or a bad param is a load error, never a runtime surprise).
- Combos rely on card **tags** (character, faction, universe), never on hard-coded card ids.
- Rarity gives no free power: strong cards pay with cost, sacrifice or a play condition (see `docs/game-design.md`).
- Every effect type ships with its tests; balance is checked with headless bot simulations.
