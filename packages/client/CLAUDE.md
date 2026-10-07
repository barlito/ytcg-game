# packages/client

React + Vite client (phase 1). Not started yet.

- Same visual identity as ytcg (« Violet Arcade » tokens: `../youl-tcg/assets/styles/theme.css`); card rendering ported from ytcg (`assets/lib/card_tilt.js`, `assets/styles/cards/`).
- Drag & drop / wind / hover tilt can be ported from `../ytcg-game-hex-prototype` (`src/lib/card-effects`).
- Served on the ytcg domain under a path prefix (to confirm: `/arena`), so the JWT cookie is sent automatically.
- The server state is the source of truth; local state is UI only (drag, animations).
