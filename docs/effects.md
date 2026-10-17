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
| `onStatusGained` | avec `status` (obligatoire, seulement ici) : quand cette carte **gagne** cet état (passe de 0 à 1 cumul ; pas sur un cumul de plus), cartes seulement. « Quand elle devient folle / défoncée / ivre : … » |
| `onMoved` | quand cette carte se déplace vers un autre lieu (effet, crise Errance, carte adverse), cartes seulement ; un déplacement fait par sa propre capacité `onMoved` ne la redéclenche pas |

**Ordre de résolution d'une révélation** : la carte est posée sur le plateau, reçoit ses états innés, joue sa capacité `onReveal`, puis les capacités `onCardPlayedHere` des cartes déjà présentes sur ce lieu (le joueur qui révèle d'abord, dans l'ordre où ses cartes sont arrivées, puis l'autre joueur), puis celles du terrain. La carte révélée ne se déclenche jamais elle-même. En fin de tour : terrains, puis cartes (`endOfTurn`), puis règles des états.

**`played`** (seulement avec `onCardPlayedHere`) : `side` (`ally`, `enemy`, `all` ; défaut `all` ici, contrairement aux autres filtres), `tag`, `status` désignent la carte jouée. Sur un terrain, seul `side: "all"` existe.

**`onDestroyed`** : la carte a déjà quitté le plateau, ses cibles sont relatives au lieu où elle était (`scope: "here"` = ce lieu). Une cible `self` n'a plus de sens (refusé), sauf pour les effets sans cible (`draw`, `addCost`, `addToHand` : « ajoute une copie de cette carte en main » fait revenir la carte). Une carte qui survit à la destruction (Coriace, Protection) ne déclenche rien.

Une capacité `ongoing` ne peut que **donner de la puissance** (`addPower`, `addPowerPerCard`) à des cibles `self` ou `cards` avec `pick: "all"` : elle est recalculée à chaque lecture, elle ne doit donc dépendre ni de la puissance ni du hasard (refusés au chargement : condition `location`, filtres `minPower` / `maxPower`).

## Filtre de cartes

Partagé par la condition `count`, la cible `cards` et l'effet `addPowerPerCard`. Seules les cartes **révélées** sur le plateau sont visibles.

| Champ | Valeurs | Défaut |
|---|---|---|
| `side` | `ally`, `enemy`, `all` | `ally` |
| `scope` | `here` (ce lieu), `elsewhere` (les deux autres), `everywhere` | `here` |
| `tag` | `universe:kda`, `character:benj`, `family:linette`, `trait:machine`, `trait:epee`… | aucun |
| `status` | `mad`, `high`, `tough`, `drunk`, `protected`, `overheat`, `asleep`, `charmed` (voir États) | aucun |
| `includeSelf` | la carte elle-même compte-t-elle ? | `false` |
| `minCost`, `maxCost` | coût **imprimé** de la carte (0 à 10) : « les cartes ennemies à 1 de coût ici », « de 2 à 4 de coût » | aucun |
| `minPower`, `maxPower` | puissance **actuelle** : « avec 9 de puissance ou plus ». Lit la puissance : **refusé dans une capacité `ongoing`** | aucun |

Un intervalle vide (`minCost` > `maxCost`, `minPower` > `maxPower`) est refusé au chargement.

Sur un **lieu** (terrain), seul `side: "all"` a du sens (un terrain n'appartient à personne) et `self` n'existe pas.

## États (statuts)

Marqueurs posés sur une carte du plateau pendant la partie, cumulables. Registre extensible : `packages/engine/src/abilities/statuses.ts`.

| Id | Nom | Règle |
|---|---|---|
| `mad` | Folie | pas de règle fixe : l'effet vient de la carte (condition `status`, déclencheur `onStatusGained`) ou d'une **crise** tirée au hasard (voir Folie) |
| `high` | Défonce | perd 1 puissance par cumul à chaque fin de tour |
| `tough` | Coriace | ne peut être ni détruite ni affaiblie (malus continus compris) |
| `drunk` | Ivresse | à chaque fin de tour, **par cumul**, gagne ou perd 2 puissance au hasard (tirage seedé) |
| `protected` | Protection | annule la prochaine destruction, le prochain malus de puissance **ou** le prochain état posé par une carte ennemie, puis perd un cumul (disparaît à zéro) |
| `asleep` | Sommeil (endormie) | ses **capacités sont coupées** tant qu'elle a un cumul (voir Capacités coupées) ; perd 1 cumul à chaque fin de tour, donc « endormie (×2) » = ce tour et le suivant |
| `charmed` | Charme (charmée) | ses **capacités sont coupées** tant que la carte qui l'a charmée est sur le plateau (révélée, pas détruite, n'importe où) ; quand elle part, le charme prend fin (`statusChanged` à 0). Plusieurs charmeurs : le charme tient tant qu'il en reste un. Un charme posé par un terrain ou inné n'a pas de charmeur : il dure jusqu'à ce qu'un effet le retire |
| `overheat` | Surchauffe | détruite dès 3 cumuls (à l'instant où elle les atteint, puis réessayé à chaque fin de tour). Réservée aux **machines** (`trait:machine`) : un effet `addStatus` ne la pose que sur elles, sauf `anyCard: true` ; un état inné `"statuses": ["overheat"]` reste permis sur toute carte. Une carte non machine qui se la pose elle-même sans `anyCard` est refusée au chargement |

**Interactions** (toutes testées) :

- Coriace passe avant Protection : une carte coriace et protégée n'est pas détruite ni affaiblie, **sans** consommer sa Protection.
- Protection absorbe tout malus de puissance **ponctuel** (`addPower` négatif d'une carte ou d'un terrain, ticks de Défonce et d'Ivresse), un par cumul, et la destruction (y compris celle de la Surchauffe). Elle n'absorbe **pas** les malus **continus** (`ongoing`) : ils sont recalculés à chaque lecture, ce ne sont pas des événements.
- Protection contre les **états** : un état posé par une carte **ennemie** (effet `addStatus`, crise Contagion d'une carte ennemie) n'est pas posé et un cumul de Protection est dépensé (événement `statusChanged` avec `spent: true`), quel que soit le nombre de cumuls de l'effet. Ne sont **pas** absorbés : la Protection elle-même, les états innés de la carte, ceux posés par une carte alliée, ceux posés par un **terrain** (il n'appartient à personne). Coriace ne bloque pas les états.
- Ivresse tire toujours son nombre au hasard, même si le −2 est ignoré (Coriace) ou absorbé (Protection) : le rejeu reste identique.
- Surchauffe + Coriace : la carte n'est jamais détruite, ses cumuls continuent de monter ; si la Coriace disparaît, elle est détruite à la fin du tour. Surchauffe + Protection : la Protection retarde la destruction d'une fois (le cumul de Protection est dépensé, la carte reste à 3+), la fin de tour la détruit.
- Un état s'ajoute au registre `statuses.ts` : texte, `rule`, puis les crochets `preventsDestroy` / `preventsPowerLoss` (immunités), `absorbsDestroy` / `absorbsPowerLoss` (boucliers à cumuls), `endOfTurn`, `onStacksChanged` et `onGained` (premier cumul).

**Capacités coupées (Endormie, Charmée).** Tant qu'une carte a un état qui coupe ses capacités (`disablesAbilities` dans le registre), **aucune** de ses capacités ne se déclenche (`endOfTurn`, `onCardPlayedHere`, `onMoved`, `onDestroyed`, `onStatusGained`…) et ses bonus `ongoing` ne comptent plus, pour les autres comme pour elle. Ce qui est déjà résolu le reste (un `onReveal` passé, une puissance gagnée). Sa **puissance imprimée** et ses modificateurs comptent toujours ; ses **états** fonctionnent toujours (Coriace la protège, Protection absorbe, Défonce la ronge) ; une **crise** de Folie continue d'agir (c'est sa folie, pas une capacité). Un seul point de contrôle dans le moteur (`AbilityRunner.run`, `ongoingBonuses`). Une carte qui définit son propre effet pour cet état (« Endormie : +3 puissance ») suit la règle générale : ses capacités restent actives et l'état ne s'use pas.

**États par carte (le « Trip »).** Une carte peut définir ses propres effets pour un état : condition `{ "type": "status", "status": "high" }` (« Défoncée : +3 puissance. », « En fin de tour, si elle est défoncée : … ») et déclencheur `onStatusGained` + `status` (« Quand elle devient ivre : … »). **L'effet défini par la carte prime sur la règle par défaut de l'état** : une telle carte ne subit plus les crochets d'action de cet état (`onGained`, `onStacksChanged`, `endOfTurn`) : pas de crise de Folie, pas de perte de la Défonce, pas de tirage d'Ivresse, pas de destruction par la Surchauffe (une machine que la Surchauffe booste). Les immunités et boucliers (Coriace, Protection) s'appliquent toujours. Le mot-clé d'un état inné ainsi remplacé s'affiche sans sa règle.

```json
{ "trigger": "ongoing", "condition": { "type": "status", "status": "high" }, "effect": { "type": "addPower", "amount": 3 } }
{ "trigger": "onStatusGained", "status": "drunk", "effect": { "type": "draw" } }
```

Une carte peut porter un état **inné**, posé dès sa révélation : `"statuses": ["tough"]` (Barlito).

## Folie (effet défini, crises)

La Folie est un état sans règle fixe, très versatile : buff, debuff, déplacement, auto-destruction, propagation.

**1. Effet défini par la carte.** Les capacités qui ne valent que lorsque la carte est folle : condition `{ "type": "status", "status": "mad" }` avec `ongoing` ou `endOfTurn` (ou tout autre déclencheur), et le déclencheur `onStatusGained` + `"status": "mad"` (une fois, quand elle devient folle). Une carte qui a au moins une telle capacité **ne tire pas de crise** (cas particulier de la règle des états par carte).

```json
{ "trigger": "ongoing", "condition": { "type": "status", "status": "mad" }, "effect": { "type": "addPower", "amount": 2 } }
```

Texte généré : `Folle : +2 puissance.` ; `En fin de tour, si elle est folle : …` ; `Quand elle devient folle : …`. Les Benj ont tous « Folle : +1 puissance » (coût 3 ou moins) ou « +2 » (au-delà) : la Folie buff les Benj, par la donnée.

**2. Crise tirée au hasard.** Une carte **sans** effet de folie défini tire, quand elle devient folle, UNE crise dans le pool ci-dessous (tirage seedé, rejouable). La crise est stockée sur la carte (`CardInstance.crisis`), publique (`CardView.crisis`, événement `crisisStarted`), affichée « FOLIE · NOM » et expliquée dans l'infobulle. Registre réglable : `packages/engine/src/abilities/crises.ts`.

| Id | Crise | Poids | Effet |
|---|---|---|---|
| `rage` | Rage | 30 | en continu : +2 puissance |
| `delirium` | Délire | 30 | en continu : −2 puissance (Coriace l'ignore ; Protection ne l'absorbe pas : malus continu) |
| `contagion` | Contagion | 20 | en fin de tour : rend folle une autre carte non folle ici au hasard (les deux camps) ; la nouvelle folle tire sa propre crise |
| `wandering` | Errance | 10 | en fin de tour : se déplace vers un autre lieu au hasard (brique `move`) |
| `implosion` | Implosion | 10 | en fin de tour : se détruit et donne +2 puissance (permanent) aux autres cartes folles ici ; si elle survit (Coriace, Protection) il n'y a pas de bonus |

Le tirage est **pondéré** (`Rng.pickWeighted`) : une crise sort avec une probabilité proportionnelle à son poids (Rage 30 %, Errance 10 %…). Le déplacement et l'auto-destruction sont plus rares.

Règles : **une seule crise par carte** (les cumuls de Folie ne tirent pas de nouvelle crise) ; une carte qui perd la Folie (`removeStatus`) **perd sa crise** et, si elle redevient folle, en retire une ; Coriace peut devenir folle, mais Délire ne l'affaiblit pas et Implosion ne la détruit pas ; l'effet de fin de tour d'une crise s'exécute après les capacités `endOfTurn` des cartes et les règles des autres états.

## Conditions (`condition`)

| Type | Paramètres | Exemple |
|---|---|---|
| `count` | filtre + `min` (défaut 1), `max` | « s'il y a un autre Benj ici » : `{ "type": "count", "tag": "character:benj" }` |
| `turn` | `min`, `max` | « à partir du tour 4 » : `{ "type": "turn", "min": 4 }` |
| `location` | `result` : `winning`, `losing`, `tied` | « si tu gagnes ce lieu » : `{ "type": "location", "result": "winning" }` : le propriétaire de la carte gagne / perd / est à égalité au lieu de la carte (somme des puissances, au moment où la capacité se résout). Cartes seulement ; **jamais `ongoing`** (elle lit la puissance) |
| `status` | `status` | « cette carte est défoncée » : `{ "type": "status", "status": "high" }` (cartes seulement, avec n'importe quel déclencheur ; remplace la règle par défaut de l'état, voir États) |

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
| `stealPower` | `amount` (≥ 1) | les cibles perdent `amount` et la carte gagne ce qui a **vraiment** été perdu (Coriace : rien ; Protection : le cumul est dépensé, rien n'est gagné). Cartes seulement (refusé sur un terrain), jamais sur `self`, jamais `ongoing`. « vole 2 puissance à la carte ennemie la plus forte ici » |
| `draw` | `count` (1 à 3, défaut 1) | le propriétaire pioche ; sur un lieu, les deux joueurs |
| `destroy` | — | détruit les cibles |
| `addStatus` | `status`, `stacks` (1 à 5, défaut 1), `anyCard` (défaut `false`) | pose un état sur les cibles ; la Surchauffe ne se pose que sur les machines (`trait:machine`), sauf `anyCard: true` (« rend les cartes ennemies ici surchauffées (machines seulement) ») |
| `removeStatus` | `status` **ou** `statuses` (liste) ; aucun des deux = tous | retire des états des cibles (« retire la Défonce et la Surchauffe des autres cartes alliées ici ») |
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

Transformation (Bankai : une version renforcée quand la version de base est en jeu), défausse, sacrifice, condition de pose, états Marquée, Enragée, copie de révélation (voir le game design), Saignement (écarté). Chaque nouvelle brique = une classe, son schéma et ses tests (voir `packages/engine/CLAUDE.md`).
