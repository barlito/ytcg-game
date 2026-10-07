# packages/client

React 19 + Vite 8 client (`@colyseus/sdk`). Minimal playable board, « Violet Arcade » tokens mirrored from ytcg in `src/styles.css`.

- `catalog.ts` bundles the same `data/` JSON as the server (`import.meta.glob`) and reuses the engine (`describeCard`, `describeLocation`) for card text — never duplicate a rule or a text here.
- `useDuel.ts` owns the SDK connection: create / join by code / send / leave, reconnection token in `sessionStorage` (a refresh goes back into the game; guarded against StrictMode double effects).
- The server message is the source of truth; local state is UI only (selected card, log). Each message is logged once (`useGameLog`).
- Cards are text tiles with the ytcg artwork as a top banner (`Artwork`, also in the terrain header): `${VITE_YTCG_URL ?? 'https://ytcg.youlz.fr'}/uploads/cards/<image>`. A missing or broken image renders nothing, the tile keeps its text layout. The ytcg-like rendering (frame, tilt, holo) is phase 4.
- Server URL: `VITE_SERVER_URL`, default `ws(s)://<host>:2567`. In production the client and server will sit on the ytcg domain behind Traefik (phase 4) so the `jwt` cookie reaches the server.
- Lint: function size limits apply to components too — split into small components.
