# Youl TCG — jeu de duel (game design)

Document vivant : chaque décision produit est notée ici, avec sa raison. Les questions ouvertes sont en fin de document.

## Principe

Duel 1 contre 1 inspiré de Marvel Snap, avec les cartes de [Youl TCG](https://github.com/barlito/youl-tcg) :

- **3 lieux** tirés des univers (extensions) de ytcg, chacun avec son effet.
- **6 tours**. L'énergie disponible est égale au numéro du tour.
- **Pose simultanée** : les deux joueurs posent leurs cartes face cachée, puis tout est révélé en fin de tour.
- Un lieu est contrôlé par le joueur qui y a le plus de **puissance**. Le joueur qui contrôle **2 lieux sur 3** gagne.
- Les **combos et références** viennent des **tags** des cartes : personnage, faction, univers.
- **Pas de « snap »** (doubler l'enjeu) : sans mise ni classement, la mécanique n'a pas de sens. Elle pourra revenir avec les mises.

### Règles fines (implémentées en phase 0, à valider en jouant)

- Main de départ : 3 cartes, plus 1 pioche au début de chaque tour. Main limitée à 7 cartes : au-delà, on ne pioche pas.
- 4 cartes maximum par joueur et par lieu. Une carte posée peut être reprise tant que le joueur n'a pas fini son tour.
- Les lieux se révèlent aux tours 1, 2 et 3, de gauche à droite.
- Ordre de révélation : le joueur qui gagne le plus de lieux révèle en premier, puis celui qui a le plus de puissance totale, sinon pile ou face. Chaque joueur révèle ses cartes dans l'ordre où il les a posées.
- Fin de partie : 2 lieux sur 3 l'emportent ; à égalité de lieux, la puissance totale départage ; sinon match nul.

## Cartes et decks

- **Deck : 12 cartes + 1 terrain**, 1 exemplaire par carte, composé uniquement de cartes **possédées** dans ytcg (`quantity > 0`). Pas de deck prêté. Un deck **mélange librement les univers** : un univers trop petit pour un deck à lui seul (Cosmonaut, 8 cartes) n'est pas un problème.
- Le holo reste **cosmétique**. Il n'a aucun effet en jeu.
- Environ 200 cartes uniques au catalogue.
- **Rareté ≠ puissance brute**. Une rare ou une légendaire n'est pas « la même carte en plus fort », sinon le jeu devient pay-to-win (boosters achetables en Youl Coin). Une carte rare peut être plus puissante, mais elle le paie : **coût plus élevé, sacrifice, condition de pose**. Le budget de puissance se règle par le coût, pas par la rareté.
- **Les 1/1 sont jouables** : ce sont des cartes très puissantes, avec une contrepartie forte. Leur équilibrage est à valider en jeu.

### Règles de deck (phase 2b)

- **Terrain** (optionnel) : chaque joueur peut apporter une carte de terrain en plus de ses 12 cartes. **C'est une carte qu'il possède dans ytcg** : les **cartes « lieu » des univers** servent de terrains (voir [Terrains](#terrains)) (pas de carte, pas de terrain — vérifié en phase 3) ; sans terrain, un terrain aléatoire prend sa place. Les terrains choisis et les terrains aléatoires sont répartis **au hasard** sur les 3 positions, donc révélés aux tours 1, 2 et 3 dans un ordre imprévisible. Une fois révélé, un terrain indique s'il est le tien ou celui de l'adversaire.
- **Quota de coûts** (`rules.ts`, réglable) : au moins 2 cartes à 1, 2 à 2 et 2 à 3 ; au plus 3 cartes à 5 ou plus.
- **Main de départ garantie** : parmi les 4 cartes vues avant de jouer au tour 1 (3 en main + la pioche du tour), au moins une coûte 1.
- **Repioche** : une fois, au tour 1, avant de poser quoi que ce soit ; la main repart dans le deck, mélangée, avec la même garantie. L'adversaire voit seulement qu'une main a été repiochée.
- **Pose cachée** : pendant le tour, l'adversaire voit combien de cartes tu as posées, jamais sur quel lieu.

### Données de départ

`make import-assets` génère `data/cards/<univers>.json` à partir des manifestes de YoulzAssets (cartes déjà en prod, univers refusés exclus) : 200 cartes sur 12 univers au 2026-10-07. L'`id` d'une carte est son uuid ytcg. Statistiques de base **sans capacité** : coût selon la rareté (common 1-2, uncommon 2-3, rare 3-4, legendary 5-6, 1/1 = 6), puissance sur la courbe 1→2, 2→3, 3→4, 4→6, 5→9, 6→12. Relancer l'import ne touche jamais aux valeurs de jeu d'une carte déjà connue (coût, puissance, tags, capacités) : seuls le nom, la rareté et le drapeau 1/1 suivent le manifeste.

**Illustrations** : chaque carte et chaque terrain porte le nom de fichier de son illustration ytcg (`image`, l'`imageName` de ytcg). Le client l'affiche depuis `${VITE_YTCG_URL}/uploads/cards/<image>` (défaut `https://ytcg.youlz.fr`) : les images restent servies par ytcg, seul le nom est figé dans les données. `make import-assets PROD_CARDS=<dump>` remplit ou rafraîchit ces noms depuis un export de prod de ytcg (cartes appariées par uuid, valeurs de jeu intactes).

### Terrains

Décisions du 2026-10-07 (phase 3a) :

- Les **cartes « lieu » des univers ytcg sont des terrains, et seulement des terrains** : elles ne sont jamais jouables comme cartes. Elles vivent dans `data/locations/<univers>.json` et non plus dans `data/cards/` ; l'`id` d'un terrain est l'uuid de la carte ytcg (pour vérifier la possession). Le catalogue refuse un id à la fois carte et terrain, et l'import ne les remet jamais en cartes.
- Les **univers sans carte lieu n'ont pas de terrain** pour l'instant (Bleach, KDA, Eldia, l'album des Youlz, Magic, Cyberpunk, Psychedelic) : pas de terrain inventé. Les anciens lieux provisoires (`loc-*`, « Terrain vague ») sont supprimés ; les terrains aléatoires sont tirés parmi les 15 terrains réels.
- Un terrain appartient à personne : ses effets touchent **les deux camps** (`side: "all"`). Effets modérés, dans le ton de la carte et de son univers.
- Cartes de ces univers qui ne sont **pas** des lieux, restées jouables : La pègre de New LA, Gala de charité, Storm of Time.

| Terrain | Univers | Effet |
|---|---|---|
| Monde-Ruche | 40K | Continu : +2 aux cartes 40K ici. |
| Colonie martienne | Cosmonaut | Continu : +2 aux cartes Cosmonaut ici. |
| Centre des opérations | Cosmonaut | Révélation : chaque joueur pioche 1 carte. |
| Ruins of the Cult | Divinity | Révélation : rend folles les cartes ici. Continu : +2 aux cartes folles ici. |
| New Los Angeles | Replicant | Continu : +2 aux cartes Replicant ici. |
| Les rues de New LA | Replicant | Continu : +2 aux cartes défoncées ici. |
| Bureau de l'inspecteur | Replicant | Fin de tour : retire tous les états des cartes ici (Coriace compris). |
| Appartement de Bébou Linette | Replicant | Continu : +2 aux Linettes ici. |
| Niveau 24 | Space Nomad | Continu : +2 aux cartes Space Nomad ici. |
| Niveau 330 | Space Nomad | Fin de tour : +1 à la carte la plus faible ici. |
| Marché noir du niveau 24 | Space Nomad | Révélation : chaque joueur pioche 2 cartes. |
| Cité d'or du niveau 776 | Space Nomad | Fin de tour : +1 à une carte ici au hasard. |
| Planète Treon CH77 | Space Nomad | Continu : +2 aux cartes coriaces ici. |
| Surface de Treon CH77 | Space Nomad | Fin de tour : −1 à la carte la plus forte ici. |
| Spatio-gare | Space Nomad | Continu : +2 aux machines ici. |

Le texte exact généré est dans [`cards.md`](cards.md).

## Effets (modèle de données)

Une carte du jeu = des statistiques et des capacités. Une capacité se compose de quatre éléments :

| Élément | Exemples |
|---|---|
| **Déclencheur** | à la révélation, en continu, à la fin du tour, quand la carte est détruite, quand une carte est jouée ici |
| **Condition** (optionnelle) | une carte du même tag est ici, ce lieu est contrôlé, la main contient N cartes |
| **Effet** | ajouter de la puissance, déplacer, détruire, piocher, modifier un coût |
| **Cible** | cette carte, les alliées ici, les ennemies ici, un lieu adjacent, une carte au hasard |

Chaque condition, cible et effet est **une classe dans un registre** (les déclencheurs sont des moments fixes du tour). Les données de la carte ne portent que le type et les paramètres, validés par un schéma. La liste des briques disponibles et leurs paramètres : [`effects.md`](effects.md).

```json
{
  "id": "<uuid de la carte ytcg>",
  "cost": 2,
  "power": 3,
  "tags": ["character:barlito", "faction:shinigami"],
  "abilities": [
    {
      "trigger": "onReveal",
      "condition": { "type": "count", "tag": "faction:shinigami" },
      "effect": { "type": "addPower", "amount": 2 },
      "target": { "type": "self" }
    }
  ]
}
```

**Les tags sont gérés sur le site ytcg**, où ils servent aussi de filtres aux joueurs (décision du 2026-10-07). En attendant l'intégration ytcg, l'import devine les tags `character:` et `family:linette` depuis le nom des cartes ; ils seront remplacés par ceux de ytcg. Variantes de noms : Pharph/Farph = Farf, Jben/Benjamen = Benj, Julieng/Julien = Julian, Warnyx/Weebou = Warny, Velo = Veli ; Ancient Foreign King = Julian ; CyberMiaou est un nouveau personnage ; les cartes de L'album des Youlz ne sont pas des personnages.

Les lieux suivent le même modèle (`data/locations/`), avec leur univers et leurs capacités.

**Les données de jeu sont des fichiers JSON versionnés** dans ce repo (`data/`), indexés par l'uuid ytcg. Un patch d'équilibrage passe par une PR testée, et une partie est rejouable avec la version de données qui l'a jouée.

## Information cachée

- Main adverse : **seul le nombre de cartes** est visible.
- Cartes posées ce tour-ci : cachées jusqu'à la révélation.
- Une fois révélée, une carte est **visible en clair, même si le joueur ne l'a jamais possédée**. Le masquage « carte jamais vue » des échanges ytcg **ne s'applique pas ici** : c'est le jeu.
- Le serveur ne doit **jamais** envoyer l'information cachée au client. Elle est filtrée par joueur dans l'état Colyseus, pas seulement masquée par l'interface.

## Architecture

| Brique | Rôle |
|---|---|
| **ytcg** (Symfony) | catalogue, possession, **decks** (création, validation par la possession), API « deck validé maintenant » |
| **packages/engine** | règles et effets en TypeScript pur, déterministe (RNG à graine), sans I/O |
| **packages/server** | room Colyseus qui fait autorité : enveloppe le moteur, auth par le JWT ytcg, état filtré par joueur, sans base de données |
| **packages/client** | React + Vite, DA « Violet Arcade » de ytcg, animations de cartes reprises de ytcg et du prototype hexagonal |

- **Même domaine que ytcg** derrière Traefik, avec des routes par préfixe de chemin (à confirmer : `/arena` pour le client, `/arena/ws` pour le serveur). Les routes au préfixe le plus long l'emportent sur celle de ytcg (la priorité Traefik par défaut = longueur de la règle). En same-origin, le cookie JWT httpOnly part tout seul avec les requêtes de matchmaking et le handshake websocket. Le serveur le vérifie avec la clé publique ytcg dans `onAuth`.
- Au moment de rejoindre une partie, le serveur demande à ytcg le deck validé contre la possession **à cet instant**, puisque marché, échanges et recyclage font bouger les cartes.

## Multijoueur (phase 2)

- **Parties privées par code** : un joueur crée la partie, reçoit un code (l'id de la room) et l'envoie à un ami, qui rejoint avec. La partie démarre dès que le second joueur arrive.
- **Chrono de tour : 60 s** (`TURN_SECONDS`). À l'échéance, le serveur termine le tour des joueurs qui ne l'ont pas fait, avec les cartes déjà posées.
- **Déconnexion** : 30 s pour revenir (`RECONNECT_SECONDS`), un rafraîchissement de page ramène dans la partie. Passé ce délai, ou en quittant, le joueur **perd par forfait**.
- **Decks** : en attendant ytcg (phase 3), le client envoie un deck de 12 cartes du catalogue (aléatoire dans le client minimal), vérifié par le serveur contre le catalogue seulement, sans contrôle de possession.
- Le client n'envoie jamais son numéro de joueur : le serveur le déduit de l'identité authentifiée.
- **Synchronisation** : chaque joueur reçoit un message avec SA vue (`projectForPlayer`), pas l'état Colyseus synchronisé avec des filtres (`StateView`). Choix du 2026-10-07 : une seule fonction pure et testée décide de ce qui est visible (les filtres demanderaient d'ajouter/retirer chaque carte de chaque vue à chaque mouvement, un oubli = une fuite), pas de second modèle Schema à maintenir, et le gain des deltas est négligeable en tour par tour. À revoir si animations fines ou spectateurs.

## Périmètre initial

- **Parties entre amis uniquement** (invitation), pas de matchmaking classé.
- **Pas de mise** en Youl Coin (peut-être plus tard), **pas de récompense**.

## Personnages et mécaniques

Identités données par l'utilisateur, traduites en capacités (détail carte par carte : [`cards.md`](cards.md)). Un personnage n'a pas un archétype figé : ses cartes varient selon l'univers, pour faire tourner les effets. S'y ajoutent de petites synergies au sein de chaque univers (« +1 aux autres cartes KDA ici »…).

| Personnage | Identité | Mécaniques principales |
|---|---|---|
| Veli | brute, la joue solo à fond | bonus s'il est **seul** ici ; légendaires qui **détruisent leurs propres alliés** ici (contrepartie) |
| Benj | parfois smart, parfois fou ; rend fou les autres et sa folie le booste | rend les cartes **folles** et gagne par carte folle ; **renforce les autres Benj, alliés comme ennemis** |
| Julian | idiot, aime les femmes | bonus **par Linette** (parfois même ennemie : il est idiot) ; God Killer détruit la carte la plus forte, même alliée |
| Barlito | dur à défaire | état inné **Coriace** |
| Farf | healer, râleur | soigne (+1 à l'allié le plus faible, retire les états) ou râle (−1 aux ennemis, voire à ses alliés) |
| Warny, Bernard | drogues et alcool ; Bernard est aussi mécano | gros bonus immédiat puis **Défonce** ; Bernard renforce les **machines** |
| Linettes | souvent des sœurs, persos atypiques | **+1 par autre Linette** ; variantes selon l'univers |

Les **états ne sont liés à aucun personnage** : n'importe quelle carte peut en poser ou en subir un (Barlito peut finir Ivre). Idées validées, à implémenter au fil de l'eau : **Ivre** (fin de tour : +2 ou −2 au hasard), **Endormie** (capacités coupées N tours), **Charmée** (capacités coupées tant que la carte qui charme est en jeu), **Saignement** (−1 par tour, soignable), **Protégée** (encaisse la prochaine destruction ou le prochain malus), **Marquée** (prime pour qui la détruit), **Surchauffe** (détruite à 3 cumuls), **Enragée** (+1 par tour, insensible aux bonus alliés).

Traits ajoutés : `trait:machine` (vaisseaux, robots, armes), `trait:epee` (les deux épées d'Eldia, qui se renforcent ensemble). D'autres traits et états viendront au fil de l'eau. **Bankai** (Bleach) : prévu plus tard, avec une brique « transformation ».

Équilibrage indicatif (bots aléatoires, 6000 parties en decks mono-univers, phase 3a) : tous les univers entre 47 et 53 % de victoires (KDA 52,9 %, Eldia 47,2 %). Depuis que les cartes lieu sont devenues des terrains, **Divinity, Replicant et Space Nomad ne peuvent plus former un deck mono-univers** (une seule carte à 1 de coût, le quota en demande 2 ; Cosmonaut, 6 cartes, ne le pouvait déjà pas) : la simulation par univers les ignore, ils restent jouables en deck mixte. Les bots ne jouent pas les synergies (Veli seul, combos Benj) : ces chiffres repèrent les cartes cassées, ils ne remplacent pas des parties réelles.

## Backlog du polish (phase 4)

Noté le 2026-10-07, à faire après l'intégration ytcg :

- **Drag & drop** des cartes de la main vers les lieux (dnd-kit + effet de vent repris de `../ytcg-game-hex-prototype`).
- **Une animation pour chaque événement** : pioche, pose sur un lieu, révélation, gain/perte de puissance, destruction, état posé/retiré, révélation d'un lieu, repioche, fin de partie. Le flux d'événements par joueur (`projectEventsForPlayer`) est déjà ordonné pour être rejoué en séquence.
- **Pause de lecture à la révélation** : après la résolution d'un tour, laisser ~5 s pour lire les cartes posées et leurs effets avant que le chrono du tour suivant ne démarre (côté serveur : l'échéance du tour suivant tient compte de cette pause).
- **Infobulles** sur les effets des cartes et sur les états (règle de Folie, Défonce, Coriace…).
- **Bonus et malus visibles sur les cartes** : puissance de base vs actuelle, détail des modificateurs (permanents et continus), états avec leur nombre de cumuls.
- Rendu façon ytcg (cadre, tilt, holo), bundle client découpé. Les illustrations sont déjà affichées (phase 3a), en simple bandeau en haut de la tuile.
- Colyseus **monitor** et **playground** au déploiement.

## Phases

1. **Phase 0 — moteur** : `packages/engine`, règles complètes, registre d'effets, cartes importées de YoulzAssets, tests, simulation par bots.
2. **Phase 1 — mécaniques** : états (Folie, Défonce, Coriace), effets multiples, capacités des cartes par personnage et par univers, texte français généré (`cards.md`).
3. **Phase 2 — multijoueur** (+ **2b, règles de deck** : terrain, quota de coûts, main garantie, repioche, pose cachée) : serveur Colyseus (session de jeu pure + room privée à deux), auth par le cookie JWT ytcg (pseudo libre en dev), vue et événements filtrés par joueur, chrono de tour, reconnexion, forfait, client React minimal jouable.
4. **Phase 3a — terrains et illustrations** : les cartes lieu deviennent des terrains (non jouables), lieux inventés supprimés, nom de fichier des illustrations ytcg dans les données, affichage dans le client.
5. **Phase 3 — intégration ytcg** (PR côté youl-tcg) : tags sur les cartes (gérés sur le site, filtres joueurs), entités de deck, API de deck validé, lien vers le jeu.
6. **Phase 4+** : invitations entre amis, rendu soigné, déploiement derrière Traefik, Bankai.
7. **Phase finale — bots d'équilibrage** : un bot glouton rapide (simule ses poses avant de jouer), puis un bot plus malin (Monte Carlo) ; decks d'archétype et constructeur de decks évolutif ; rapport des combos (gain par paire de cartes, popularité dans les decks gagnants).

## Questions ouvertes

- Le nom d'une carte vient de ytcg : on le récupère à l'exécution (API) ou on garde la copie des données de jeu (comme le nom de fichier de l'illustration aujourd'hui) ?
- Divinity, Replicant et Space Nomad n'ont plus qu'une carte à 1 de coût, donc plus de deck mono-univers : passer une carte à 1 dans chacun (coûts) si l'on veut ces decks ?
- Comment évoluent les lieux : tirés au hasard parmi tous les univers, ou liés aux univers des decks ?
- Un nouveau joueur a-t-il assez de cartes distinctes pour composer 12 cartes dès ses premiers jours ?
- Que devient une carte vendue ou échangée alors qu'elle est dans un deck : le deck devient invalide, ou on bloque la vente ?
- Le slug de Bleach est temporairement `benj-reviens` en prod ; les données de jeu gardent `b` (manifeste) jusqu'à la synchronisation avec ytcg.
- Valeurs des capacités : première version à relire dans `cards.md`, à rejouer en vrai.
