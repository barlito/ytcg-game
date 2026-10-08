# packages/client

React 19 + Vite 8 client (`@colyseus/sdk`). Minimal playable board, « Violet Arcade » tokens mirrored from ytcg in `src/styles.css`.

- `catalog.ts` bundles the same `data/` JSON as the server (`import.meta.glob`) and reuses the engine (`describeCard`, `describeLocation`) for card text — never duplicate a rule or a text here.
- `useDuel.ts` owns the SDK connection: create / join by code / send / leave, reconnection token in `sessionStorage` (a refresh goes back into the game; guarded against StrictMode double effects).
- The server message is the source of truth; local state is UI only (selected card, log). Each message is logged once (`useGameLog`).
- Cards (`components/card/`): `CardFace` is a light port of the ytcg card (artwork from `${VITE_YTCG_URL ?? 'https://ytcg.youlz.fr'}/uploads/cards/<image>`, mat, neon line, rarity glow, cost/power badges, hover tilt through CSS variables in `lib/hoverTilt.ts`, no React render per frame). `CardButton` is the focusable shell (tooltip, replay float, drag handle). Sizes use container units (`cqi`); small board cards only show artwork and numbers.
- Drag & drop (`@dnd-kit/core`, `components/dnd/`): rules in `dnd.ts` (pure, tested) read `view.playableCards` / `view.openLocations` — never recompute a rule. Mouse drags after 6 px, touch after a 180 ms press, so taps stay clicks (click-to-select + « Poser ici » is the keyboard path).
- Replay (`animation/`): `queue.ts` (steps + durations), `scene.ts` (what the replay hides or animates on top of the final view), `placements.ts` (last spot of destroyed cards, drawn as ghosts). `useReplay` adjusts its state during render when a new message arrives (no setState in effects). Reduced motion = no replay.
- Tooltips render in a portal (`Tooltip`, `useTooltipAnchor`: hover, focus-visible, tap). The anchor is an element in state, not a ref read during render (React Compiler lint).
- Bundle: `Home` and `Board` are lazy; the first chunk only imports zod-free names from `@ytcg-game/server/messages` (types from `/protocol` are erased).
- Server URL: `VITE_SERVER_URL`, default `ws(s)://<host>:2567`. In production the client and server will sit on the ytcg domain behind Traefik (phase 4) so the `jwt` cookie reaches the server.
- Lint: function size limits apply to components too — split into small components.
