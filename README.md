# ytcg-game

Jeu de duel en 1 contre 1 autour des cartes de [Youl TCG](https://github.com/barlito/youl-tcg), inspiré de Marvel Snap : 3 lieux, 6 tours, pose simultanée, combos par tags.

- `packages/engine` : règles et effets (TypeScript pur)
- `packages/server` : serveur multijoueur [Colyseus](https://colyseus.io)
- `packages/client` : client React + Vite
- `data/` : données de jeu des cartes et des lieux (JSON versionné)

Game design et décisions : [`docs/game-design.md`](docs/game-design.md). Briques d'effets : [`docs/effects.md`](docs/effects.md).

## Développement

Node tourne dans Docker, rien à installer sur l'hôte :

```bash
make install         # npm install sur tous les workspaces
make up              # serveur de jeu (:2567) + client (http://localhost:5173), pseudo libre en dev
make down            # arrête le serveur et le client
make check           # typecheck + tests (ce que lance la CI)
make sim ARGS="--games 2000 --mode universe"   # parties entre bots aléatoires
make import-assets   # (re)génère data/cards depuis ~/YoulzAssets (ASSETS=… pour un autre chemin)
make sh              # shell dans un conteneur Node
```
