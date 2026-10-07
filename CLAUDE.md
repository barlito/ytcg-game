# CLAUDE.md

Guidance for Claude Code in this repository.

## Project

Two-player duel game (Marvel Snap-like: 3 locations, 6 turns, simultaneous reveal) built on the cards of **Youl TCG** (`../youl-tcg`, Symfony). Product decisions and open questions live in `docs/game-design.md` — read it first, and record every new decision there.

## Layout (npm workspaces monorepo)

- `packages/engine` — pure TypeScript rules + effect registry. No I/O, deterministic (seeded RNG). See its CLAUDE.md.
- `packages/server` — authoritative Colyseus server wrapping the engine. See its CLAUDE.md.
- `packages/client` — React + Vite client. See its CLAUDE.md.
- `data/cards`, `data/locations` — versioned game data (JSON), keyed by the ytcg card uuid.

## Boundaries with ytcg

- ytcg owns the catalogue, card ownership and **decks**. This repo never stores players, ownership or decks.
- The server asks ytcg for a deck validated against ownership when a player joins a match.
- Auth: the ytcg JWT cookie (same domain behind Traefik), verified with the ytcg public key.
- Hidden information (opponent hand, unrevealed cards) must be filtered per player in the server state, never just hidden by the UI. The ytcg trade masking rule does NOT apply: a revealed card is shown in clear.

## Environment

- No Node on the host: everything runs in Docker (`node:24-alpine`) through the Makefile: `make install`, `make check` (typecheck + lint + tests, what CI runs), `make fix` (Prettier + ESLint autofix), `make sim`, `make cards-doc`, `make import-assets`, `make sh`.
- `data/cards` is seeded from `~/YoulzAssets/YTCG/*/manifest.json` by `tools/import-youlz-assets.ts`; re-running it keeps the game values of known cards. Hand-tune cards in the JSON, never in the importer, then `make cards-doc`.

## Code quality

- TypeScript 6 (NOT 7: typescript-eslint does not support the native compiler yet), strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `erasableSyntaxOnly`.
- ESLint `strictTypeChecked` + `stylisticTypeChecked` with size limits (complexity 10, 50 lines per function, 250 per file, depth 3, 4 params) — split the code rather than raising them. Prettier (120 columns, single quotes). No `any`, no `!`, a cast needs a reason.

## Workflow

- One phase = one branch `feat/phase-N-<name>` = one PR with its own tests. Conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`, `ci:`). Merge only after manual validation.
- Never add a Claude co-author trailer nor mention Claude in PRs.
- Code comments in English, user-facing strings in French. Short one-line comments only, for non-obvious constraints.

## Legacy

The previous hex-board prototype lives in `../ytcg-game-hex-prototype` (repo `barlito/ytcg-game-client`, kept on purpose). Its drag (`useDragWind`), hover tilt (`useHoverTilt`) and dnd-kit setup are candidates for reuse in `packages/client`; the hex board itself is not the target design.
