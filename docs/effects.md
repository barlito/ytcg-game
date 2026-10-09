# Briques d'effets disponibles

La boîte à outils pour décrire les capacités des cartes et des lieux dans `data/`. Une capacité = **déclencheur** + **condition** (optionnelle) + **cible** + **un effet ou une liste d'effets** (appliqués dans l'ordre aux mêmes cibles). Toute combinaison invalide est refusée au chargement, avec un message qui dit où. Le texte joueur de chaque carte est généré dans [`cards.md`](cards.md) (`make cards-doc`).

## Déclencheurs (`trigger`)

| Valeur | Quand |
|---|---|
| `onReveal` | au moment où la carte est révélée (ou le lieu, au tour 1, 2 ou 3) |
| `ongoing` | en continu tant que la carte est sur le plateau (ou le lieu révélé) |
| `endOfTurn` | à la fin de chaque tour, après les révélations |
| `onCardPlayedHere` | quand une **autre** carte est révélée sur ce lieu après celle-ci (cartes et terrain) ; filtre optionnel `played` |
| `onDestroyed` | quand cette carte est détruite (cartes seulement) |

**Ordre de résolution d'une révélation** : la carte est posée sur le plateau, reçoit ses états innés, joue sa capacité `onReveal`, puis les capacités `onCardPlayedHere` des cartes déjà présentes sur ce lieu (le joueur qui révèle d'abord, dans l'ordre où ses cartes sont arrivées, puis l'autre joueur), puis celles du terrain. La carte révélée ne se déclenche jamais elle-même. En fin de tour : terrains, puis cartes (`endOfTurn`), puis règles des états.

**`played`** (seulement avec `onCardPlayedHere`) : `side` (`ally`, `enemy`, `all` ; défaut `all` ici, contrairement aux autres filtres), `tag`, `status` désignent la carte jouée. Sur un terrain, seul `side: "all"` existe.

**`onDestroyed`** : la carte a déjà quitté le plateau, ses cibles sont relatives au lieu où elle était (`scope: "here"` = ce lieu). Une cible `self` n'a plus de sens (refusé), sauf pour les effets sans cible (`draw`, `addCost`, `addToHand` : « ajoute une copie de cette carte en main » fait revenir la carte). Une carte qui survit à la destruction (Coriace, Protection) ne déclenche rien.

Une capacité `ongoing` ne peut que **donner de la puissance** (`addPower`, `addPowerPerCard`) à des cibles `self` ou `cards` avec `pick: "all"` : elle est recalculée à chaque lecture, elle ne doit donc dépendre ni de la puissance ni du hasard.

## Filtre de cartes

Partagé par la condition `count`, la cible `cards` et l'effet `addPowerPerCard`. Seules les cartes **révélées** sur le plateau sont visibles.

| Champ | Valeurs | Défaut |
|---|---|---|
| `side` | `ally`, `enemy`, `all` | `ally` |
| `scope` | `here` (ce lieu), `elsewhere` (les deux autres), `everywhere` | `here` |
| `tag` | `universe:kda`, `character:benj`, `family:linette`, `trait:machine`, `trait:epee`… | aucun |
| `status` | `mad`, `high`, `tough`, `drunk`, `protected`, `overheat` (voir États) | aucun |
| `includeSelf` | la carte elle-même compte-t-elle ? | `false` |

Sur un **lieu** (terrain), seul `side: "all"` a du sens (un terrain n'appartient à personne) et `self` n'existe pas.

## États (statuts)

Marqueurs posés sur une carte du plateau pendant la partie, cumulables. Registre extensible : `packages/engine/src/abilities/statuses.ts`.

| Id | Nom | Règle |
|---|---|---|
| `mad` | Folie | aucune : lue par d'autres cartes (Benj, Chaos…). Sa règle propre est en discussion |
| `high` | Défonce | perd 1 puissance par cumul à chaque fin de tour |
| `tough` | Coriace | ne peut être ni détruite ni affaiblie (malus continus compris) |
| `drunk` | Ivresse | à chaque fin de tour, **par cumul**, gagne ou perd 2 puissance au hasard (tirage seedé) |
| `protected` | Protection | annule la prochaine destruction **ou** le prochain malus de puissance, puis perd un cumul (disparaît à zéro) |
| `overheat` | Surchauffe | détruite dès 3 cumuls (à l'instant où elle les atteint, puis réessayé à chaque fin de tour) |

**Interactions** (toutes testées) :

- Coriace passe avant Protection : une carte coriace et protégée n'est pas détruite ni affaiblie, **sans** consommer sa Protection.
- Protection absorbe tout malus de puissance **ponctuel** (`addPower` négatif d'une carte ou d'un terrain, ticks de Défonce et d'Ivresse), un par cumul, et la destruction (y compris celle de la Surchauffe). Elle n'absorbe **pas** les malus **continus** (`ongoing`) : ils sont recalculés à chaque lecture, ce ne sont pas des événements.
- Ivresse tire toujours son nombre au hasard, même si le −2 est ignoré (Coriace) ou absorbé (Protection) : le rejeu reste identique.
- Surchauffe + Coriace : la carte n'est jamais détruite, ses cumuls continuent de monter ; si la Coriace disparaît, elle est détruite à la fin du tour. Surchauffe + Protection : la Protection retarde la destruction d'une fois (le cumul de Protection est dépensé, la carte reste à 3+), la fin de tour la détruit.
- Un état s'ajoute au registre `statuses.ts` : texte, `rule`, puis les crochets `preventsDestroy` / `preventsPowerLoss` (immunités), `absorbsDestroy` / `absorbsPowerLoss` (boucliers à cumuls), `endOfTurn` et `onStacksChanged`. La Folie recevra sa règle de la même façon, sans refonte.

Une carte peut porter un état **inné**, posé dès sa révélation : `"statuses": ["tough"]` (Barlito).

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
| `addStatus` | `status`, `stacks` (1 à 5, défaut 1) | pose un état sur les cibles |
| `removeStatus` | `status` (absent = tous) | retire un état des cibles |
| `move` | `destination` : `random` (défaut), `left`, `right` | déplace les cibles vers un autre lieu **de leur camp** qui a une place libre ; sans place, rien ne se passe |
| `addCost` | `amount` (≠ 0, négatif = moins cher), `cards` : `hand` (défaut) ou `next`, `tag` optionnel | change le coût des cartes en **main** du propriétaire (les deux joueurs sur un terrain) ; coût plancher 0 |
| `addToHand` | `card` (id du catalogue, absent = copie de cette carte), `count` (1 à 3, défaut 1) | ajoute des cartes neuves en main ; rien si la main est pleine (7) |

`draw`, `addCost` et `addToHand` ignorent la cible de la capacité.

### Déplacement (`move`)

- Destinations : `random` = un autre lieu au hasard parmi ceux où le camp de la carte a une place libre ; `left` / `right` = le lieu voisin seulement (pas de rebouclage), s'il a une place. Les places comptent les cartes déjà posées **et** celles encore face cachée du même joueur qui attendent leur révélation, plus la capacité du lieu (règles de terrain).
- Les cibles sont choisies avant les effets de la capacité. Une carte déplacée garde statuts et modificateurs ; ses effets `ongoing` suivent (ils sont lus à son nouveau lieu). `onReveal` ne se redéclenche pas. Un déplacement n'est pas une « pose » : il ne déclenche pas `onCardPlayedHere`. Événement `cardMoved` (`from`, `to`), public.

### Coût modifié (`addCost`)

- `hand` : chaque carte actuellement en main (filtrée par `tag`) reçoit la modification, qui reste sur la carte tant qu'elle est en main (elle ne descend jamais le coût imprimé sous 0, donc une hausse ultérieure part de 0).
- `next` : la modification attend la prochaine carte jouée (filtrée par `tag`) ; elle s'applique à l'affichage de toutes les cartes concernées de la main, puis est consommée par la première jouée, et rendue si on la reprend (annulation).
- Le **coût effectif** est celui du moteur : jouabilité, `playableCards`, `CardView.cost`, bots. Information cachée : l'événement `costChanged` n'est envoyé qu'au propriétaire.

### Ajout en main (`addToHand`)

La nouvelle carte est une instance neuve du propriétaire (comme une pioche), sans état ni modificateur. L'adversaire reçoit `cardAddedToHand` sans l'identité de la carte et voit seulement `handCount` grossir. La référence `card` est vérifiée au chargement (id inconnu refusé) ; sur un terrain, `card` est obligatoire et chaque joueur reçoit la carte.

## Règles de terrain (`rules`)

Propriétés d'un lieu lues par les règles, à côté de `abilities` dans `data/locations/*.json` (pas des effets ponctuels). Elles ne s'appliquent qu'**une fois le lieu révélé** et n'expulsent jamais une carte déjà posée.

| Champ | Valeurs | Effet |
|---|---|---|
| `capacity` | 1 à 4 | cartes maximum par joueur ici (défaut 4) |
| `closedFromTurn` | 1 à 6 | plus aucune carte ne peut être posée ici à partir de ce tour |
| `openFromTurn` | 2 à 6 | aucune carte ne peut être posée ici avant ce tour |

`openFromTurn` doit précéder `closedFromTurn` (sinon plus aucune carte ne pourrait être posée : refusé au chargement). `openLocations(catalog, state, player)` et la vue (`openLocations`) en tiennent compte ; la pose refusée renvoie `locationClosed` (ou `locationFull`).

```json
{ "id": "…", "name": "Ruelle étroite", "rules": { "capacity": 2, "closedFromTurn": 5 }, "abilities": [] }
```

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

Terrain « Les rues de New LA » : « Les cartes défoncées ici ont +2 » (des deux camps).
```json
{ "trigger": "ongoing", "target": { "type": "cards", "side": "all", "status": "high" }, "effect": { "type": "addPower", "amount": 2 } }
```

Terrain « Surface de Treon CH77 » : « En fin de tour : −1 à la carte la plus forte ici » (quel que soit son camp).
```json
{ "trigger": "endOfTurn", "target": { "type": "cards", "side": "all", "pick": "strongest" }, "effect": { "type": "addPower", "amount": -1 } }
```

« À la révélation : +3 à une autre carte alliée ici au hasard et la rend défoncée » (Jben Alchemist).
```json
{ "trigger": "onReveal", "target": { "type": "cards", "pick": "random" }, "effect": [{ "type": "addPower", "amount": 3 }, { "type": "addStatus", "status": "high" }] }
```

« Quand une autre carte Benj alliée est jouée ici : +2 » (déclencheur « jouée ici »).
```json
{ "trigger": "onCardPlayedHere", "played": { "side": "ally", "tag": "character:benj" }, "effect": { "type": "addPower", "amount": 2 } }
```

Terrain : « Quand une carte est jouée ici : chaque carte ici gagne +1 ».
```json
{ "trigger": "onCardPlayedHere", "target": { "type": "cards", "side": "all" }, "effect": { "type": "addPower", "amount": 1 } }
```

« Quand cette carte est détruite : −3 à la carte ennemie la plus forte ici. »
```json
{ "trigger": "onDestroyed", "target": { "type": "cards", "side": "enemy", "pick": "strongest" }, "effect": { "type": "addPower", "amount": -3 } }
```

« Quand cette carte est détruite : ajoute une copie de cette carte en main. »
```json
{ "trigger": "onDestroyed", "effect": { "type": "addToHand" } }
```

« En fin de tour : se déplace vers le lieu de droite. »
```json
{ "trigger": "endOfTurn", "effect": { "type": "move", "destination": "right" } }
```

« À la révélation : déplace la carte ennemie la plus faible ici vers un autre lieu au hasard. »
```json
{ "trigger": "onReveal", "target": { "type": "cards", "side": "enemy", "pick": "weakest" }, "effect": { "type": "move" } }
```

« À la révélation : les cartes Benj en main coûtent 2 de moins » / « la prochaine carte jouée coûte 2 de moins ».
```json
{ "trigger": "onReveal", "effect": { "type": "addCost", "amount": -2, "tag": "character:benj" } }
{ "trigger": "onReveal", "effect": { "type": "addCost", "amount": -2, "cards": "next" } }
```

« À la révélation : ajoute 2 copies de cette carte en main » / « ajoute « Nom » en main ».
```json
{ "trigger": "onReveal", "effect": { "type": "addToHand", "count": 2 } }
{ "trigger": "onReveal", "effect": { "type": "addToHand", "card": "<id d'une carte du catalogue>" } }
```

États : « devient ivre (×2) », « rend la carte alliée la plus faible protégée ».
```json
{ "trigger": "onReveal", "effect": { "type": "addStatus", "status": "drunk", "stacks": 2 } }
{ "trigger": "onReveal", "target": { "type": "cards", "pick": "weakest" }, "effect": { "type": "addStatus", "status": "protected" } }
```

## Ce qui n'existe pas encore

Transformation (Bankai : une version renforcée quand la version de base est en jeu), défausse, sacrifice, condition de pose, états Endormie, Charmée, Saignement, Marquée, Enragée (voir le game design), règle propre de la Folie. Chaque nouvelle brique = une classe, son schéma et ses tests (voir `packages/engine/CLAUDE.md`).
