# Briques d'effets disponibles

La boîte à outils pour décrire les capacités des cartes et des lieux dans `data/`. Une capacité = **déclencheur** + **condition** (optionnelle) + **cible** + **effet**. Toute combinaison invalide est refusée au chargement, avec un message qui dit où.

## Déclencheurs (`trigger`)

| Valeur | Quand |
|---|---|
| `onReveal` | au moment où la carte est révélée (ou le lieu, au tour 1, 2 ou 3) |
| `ongoing` | en continu tant que la carte est sur le plateau (ou le lieu révélé) |
| `endOfTurn` | à la fin de chaque tour, après les révélations |

Une capacité `ongoing` ne peut que **donner de la puissance** (`addPower`, `addPowerPerCard`) à des cibles `self` ou `cards` avec `pick: "all"` : elle est recalculée à chaque lecture, elle ne doit donc dépendre ni de la puissance ni du hasard.

## Filtre de cartes

Partagé par la condition `count`, la cible `cards` et l'effet `addPowerPerCard`. Seules les cartes **révélées** sur le plateau sont visibles.

| Champ | Valeurs | Défaut |
|---|---|---|
| `side` | `ally`, `enemy`, `all` | `ally` |
| `scope` | `here` (ce lieu), `elsewhere` (les deux autres), `everywhere` | `here` |
| `tag` | `universe:kda`, `character:benj`, `family:linette`… | aucun |
| `includeSelf` | la carte elle-même compte-t-elle ? | `false` |

Sur un **lieu**, seul `side: "all"` a du sens (un lieu n'appartient à personne) et `self` n'existe pas.

## Conditions (`condition`)

| Type | Paramètres | Exemple |
|---|---|---|
| `count` | filtre + `min` (défaut 1), `max` | « s'il y a un autre Benj ici » : `{ "type": "count", "tag": "character:benj" }` |
| `turn` | `min`, `max` | « à partir du tour 4 » : `{ "type": "turn", "min": 4 }` |

## Cibles (`target`, défaut `self`)

| Type | Paramètres | Exemple |
|---|---|---|
| `self` | — | la carte elle-même |
| `cards` | filtre + `pick` : `all` (défaut), `random`, `weakest`, `strongest` | « l'ennemi le plus faible ici » : `{ "type": "cards", "side": "enemy", "pick": "weakest" }` |

## Effets (`effect`)

| Type | Paramètres | Effet |
|---|---|---|
| `addPower` | `amount` (≠ 0, négatif possible) | ajoute de la puissance aux cibles |
| `addPowerPerCard` | `amount`, `count` (filtre) | `amount` × nombre de cartes qui passent le filtre |
| `draw` | `count` (1 à 3, défaut 1) | le propriétaire pioche ; sur un lieu, les deux joueurs |
| `destroy` | — | détruit les cibles |

## Exemples

« À la révélation : +3 s'il y a un autre Benj ici. »
```json
{ "trigger": "onReveal", "condition": { "type": "count", "tag": "character:benj" }, "effect": { "type": "addPower", "amount": 3 } }
```

« Continu : +2 pour chaque Linette alliée sur le plateau. »
```json
{ "trigger": "ongoing", "effect": { "type": "addPowerPerCard", "amount": 2, "count": { "scope": "everywhere", "tag": "family:linette" } } }
```

« Continu : les autres cartes KDA alliées ici ont +1. »
```json
{ "trigger": "ongoing", "target": { "type": "cards", "tag": "universe:kda" }, "effect": { "type": "addPower", "amount": 1 } }
```

« À la révélation : détruit la carte ennemie la plus faible ici. »
```json
{ "trigger": "onReveal", "target": { "type": "cards", "side": "enemy", "pick": "weakest" }, "effect": { "type": "destroy" } }
```

Lieu « Seireitei » : « Les cartes Bleach ici ont +2 » (des deux camps).
```json
{ "trigger": "ongoing", "target": { "type": "cards", "side": "all", "tag": "universe:b" }, "effect": { "type": "addPower", "amount": 2 } }
```

## Ce qui n'existe pas encore

Coût modifié, déplacement de cartes, défausse, cartes ajoutées en main, sacrifice, condition de pose, déclencheur « quand une carte est détruite » ou « quand une carte est jouée ici », effets de lieu qui changent les règles (capacité, interdiction de jouer). Chaque nouvelle brique = une classe, son schéma et ses tests (voir `packages/engine/CLAUDE.md`).
