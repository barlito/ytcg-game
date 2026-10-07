# packages/engine

Pure game rules. Imported by the server (authoritative) and the client (types, previews). Player-facing reference of the building blocks: `docs/effects.md` — keep it in sync.

## Layout

- `game.ts`: the public API only (`createGame`, `applyAction`, queries). `action.ts`: zod schema of player actions — parse network input with it. `invariants.ts`: `checkInvariants(state)`.
- `runtime/`: `Runtime` (composition root, one state + one event list) wires `GameBoard` (board queries, power, elementary mutations — implements `Board`), `AbilityRunner` (fires abilities per trigger), `TurnFlow` (turn start, resolution, end of game), `ActionHandler` (play / cancel / end turn rules) and `setup.ts` (`startGame`, `validateDeck`).
- `abilities/`: `board.ts` holds the contracts — `BoardView` (read) for conditions and ongoing bonuses, `Board` (read + write) for targets and effects, `OngoingEffect` for effects allowed on ongoing abilities.

## Rules of the code

- No I/O, no network, no Colyseus, no timers, no `Math.random()`: every random draw goes through the `Rng` held in the game state (`state.rng`), so a seed + the action list replays a match exactly. `src/sim/` is the only Node-dependent part (data loader, bots, CLI).
- `applyAction()` clones the state and never mutates its input; queries (`powerOf`, `locationPowers`, `projectForPlayer`) never consume randomness.
- The state is plain JSON (no class instances, no Map): it must survive `structuredClone` and the network.
- Node runs the sources directly (type stripping): `erasableSyntaxOnly` is on — no enums, no parameter properties, no namespaces. Relative imports keep the `.ts` extension.
- Only REVEALED board cards exist for abilities (`Board.cardsMatching`); pending cards are invisible until the reveal.
- Ongoing power is recomputed on every read (`Runtime.power`): an ongoing ability may only add power, with `self` or `pick: "all"` targets, and no condition may read power — otherwise power would depend on itself.
- Combos rely on card **tags** (`universe:`, `character:`, `family:`…), never on hard-coded card ids. `universe:<slug>` is added by the catalog from the data file.
- Deck rules live in `deck.ts` (`deckCurveIssues`, `buildRandomDeck`, `guaranteeOpening`) with their constants in `rules.ts`; `validateDeck` applies the curve. Every random deck (client, sim, tests) goes through `buildRandomDeck`. Test fixtures pad with power-0 fillers covering the curve (`deckOf(ids, catalog)`).
- The opponent never learns where a face-down card was played: the view only exposes `opponent.pendingCount`.
- Rarity gives no free power: strong cards pay with cost, sacrifice or a play condition (see `docs/game-design.md`).

## Adding a building block

1. A class in `src/abilities/{conditions,targets,effects}.ts` with its zod `schema` (literal `type`) and its behaviour, added to the discriminated union and to the `create*` switch (exhaustive: TypeScript flags a missing case).
2. If it may be ongoing → `ONGOING_EFFECTS` + `ongoingBonus()`; if it ignores the target → `UNTARGETED_EFFECTS`.
3. Its French text in `src/describe.ts` (`describeEffect` + `describeFollowingEffect`).
4. Tests in `tests/abilities.test.ts` (fixture cards in the test file, never the real data), validation tests in `tests/catalog.test.ts`, text tests in `tests/describe.test.ts`, a line in `docs/effects.md`.

## Statuses

- Registry `src/abilities/statuses.ts`: one entry per status (French `name` + `adjective` for the text, optional `rule`, `preventsDestroy`, `preventsPowerLoss`, `endOfTurn` hook). Adding one = an entry there + tests; the zod enum and the text follow. Stacks live on the card instance (`statuses`), cleared by `removeStatus`.
- `tough` also ignores negative ONGOING bonuses (`Runtime.power`), not only `addPower`.

## Effect text

- `src/describe.ts` turns ability params into French (`describeCard`, `describeLocation`); the client will reuse it. Follow-up effects of an ability use a pronoun (« et la rend défoncée »).
- `docs/cards.md` is generated (`make cards-doc`) and a test fails when it is stale: regenerate after every data change.

## Tests and tools

- `tests/support.ts`: `newGame()` puts chosen cards in hand with 10 energy, `playTurn()` plays both sides by definition id, `skipToTurn()`, `powerAt()`.
- `make sim ARGS="--games 2000 --mode universe"`: random bots, seat balance, win rate per universe and per card. Random bots only tell broken from fine; they are not a balance verdict.
