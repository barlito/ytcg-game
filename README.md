# ytcg-game

Jeu de duel en 1 contre 1 autour des cartes de [Youl TCG](https://github.com/barlito/youl-tcg), inspiré de Marvel Snap : 3 lieux, 6 tours, pose simultanée, combos par tags.

- `packages/engine` : règles et effets (TypeScript pur)
- `packages/server` : serveur multijoueur [Colyseus](https://colyseus.io)
- `packages/client` : client React + Vite
- `data/` : données de jeu des cartes et des lieux (JSON versionné)

Game design et décisions : [`docs/game-design.md`](docs/game-design.md).

## Développement

Node tourne dans Docker, rien à installer sur l'hôte :

```bash
make install   # npm install sur tous les workspaces
make sh        # shell dans un conteneur Node
```
