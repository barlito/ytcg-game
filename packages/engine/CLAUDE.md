# packages/engine

Pure game rules. Imported by the server (authoritative) and the client (types, previews). Player-facing reference of the building blocks: `docs/effects.md` — keep it in sync.

## Rules of the code

- No I/O, no network, no Colyseus, no timers, no `Math.random()`: every random draw goes through the `Rng` held in the game state (`state.rng`), so a seed + the action list replays a match exactly. `src/sim/` is the only Node-dependent part (data loader, bots, CLI).
- `applyAction()` clones the state and never mutates its input; queries (`powerOf`, `locationPowers`, `projectForPlayer`) never consume randomness.
- The state is plain JSON (no class instances, no Map): it must survive `structuredClone` and the network.
- Node runs the sources directly (type stripping): `erasableSyntaxOnly` is on — no enums, no parameter properties, no namespaces. Relative imports keep the `.ts` extension.
- Only REVEALED board cards exist for abilities (`Board.cardsMatching`); pending cards are invisible until the reveal.
- Ongoing power is recomputed on every read (`Runtime.power`): an ongoing ability may only add power, with `self` or `pick: "all"` targets, and no condition may read power — otherwise power would depend on itself.
- Combos rely on card **tags** (`universe:`, `character:`, `family:`…), never on hard-coded card ids. `universe:<slug>` is added by the catalog from the data file.
- Rarity gives no free power: strong cards pay with cost, sacrifice or a play condition (see `docs/game-design.md`).

## Adding a building block

1. A class in `src/abilities/{conditions,targets,effects}.ts` with its zod `schema` (literal `type`) and its behaviour, added to the discriminated union and to the `create*` switch (exhaustive: TypeScript flags a missing case).
2. If it may be ongoing → `ONGOING_EFFECTS` + `ongoingBonus()`; if it ignores the target → `UNTARGETED_EFFECTS`.
3. Tests in `tests/abilities.test.ts` (fixture cards in the test file, never the real data), validation tests in `tests/catalog.test.ts`, a line in `docs/effects.md`.

## Tests and tools

- `tests/support.ts`: `newGame()` puts chosen cards in hand with 10 energy, `playTurn()` plays both sides by definition id, `skipToTurn()`, `powerAt()`.
- `make sim ARGS="--games 2000 --mode universe"`: random bots, seat balance, win rate per universe and per card. Random bots only tell broken from fine; they are not a balance verdict.
