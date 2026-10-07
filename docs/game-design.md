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

- **Deck : 12 cartes, 1 exemplaire par carte**, composé uniquement de cartes **possédées** dans ytcg (`quantity > 0`). Pas de deck prêté. Un deck **mélange librement les univers** : un univers trop petit pour un deck à lui seul (Cosmonaut, 8 cartes) n'est pas un problème.
- Le holo reste **cosmétique**. Il n'a aucun effet en jeu.
- Environ 200 cartes uniques au catalogue.
- **Rareté ≠ puissance brute**. Une rare ou une légendaire n'est pas « la même carte en plus fort », sinon le jeu devient pay-to-win (boosters achetables en Youl Coin). Une carte rare peut être plus puissante, mais elle le paie : **coût plus élevé, sacrifice, condition de pose**. Le budget de puissance se règle par le coût, pas par la rareté.
- **Les 1/1 sont jouables** : ce sont des cartes très puissantes, avec une contrepartie forte. Leur équilibrage est à valider en jeu.

### Données de départ

`make import-assets` génère `data/cards/<univers>.json` à partir des manifestes de YoulzAssets (cartes déjà en prod, univers refusés exclus) : 200 cartes sur 12 univers au 2026-10-07. L'`id` d'une carte est son uuid ytcg. Statistiques de base **sans capacité** : coût selon la rareté (common 1-2, uncommon 2-3, rare 3-4, legendary 5-6, 1/1 = 6), puissance sur la courbe 1→2, 2→3, 3→4, 4→6, 5→9, 6→12. Relancer l'import ne touche jamais aux valeurs de jeu d'une carte déjà connue (coût, puissance, tags, capacités) : seuls le nom, la rareté et le drapeau 1/1 suivent le manifeste.

Les lieux (`data/locations/locations.json`) sont provisoires : un par univers (« les cartes de cet univers ici ont +2 », des deux camps) plus un lieu neutre.

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

Traits ajoutés : `trait:machine` (vaisseaux, robots, armes), `trait:epee` (les deux épées d'Eldia, qui se renforcent ensemble). D'autres traits et états viendront au fil de l'eau. **Bankai** (Bleach) : prévu plus tard, avec une brique « transformation ».

Équilibrage indicatif (bots aléatoires, 6000 parties en decks mono-univers) : tous les univers entre 48 et 53 % de victoires. Les bots ne jouent pas les synergies (Veli seul, combos Benj) : ces chiffres repèrent les cartes cassées, ils ne remplacent pas des parties réelles.

## Phases

1. **Phase 0 — moteur** : `packages/engine`, règles complètes, registre d'effets, cartes importées de YoulzAssets, tests, simulation par bots.
2. **Phase 1 — mécaniques** : états (Folie, Défonce, Coriace), effets multiples, capacités des cartes par personnage et par univers, texte français généré (`cards.md`).
3. **Phase 2 — multijoueur** : room Colyseus autour du moteur, auth JWT, état filtré, client minimal jouable.
4. **Phase 3 — intégration ytcg** (PR côté youl-tcg) : tags sur les cartes (gérés sur le site, filtres joueurs), entités de deck, API de deck validé, lien vers le jeu.
5. **Phase 4+** : invitations entre amis, rendu soigné, déploiement derrière Traefik, Bankai.

## Questions ouvertes

- Le nom et les visuels d'une carte viennent de ytcg : on les récupère à l'exécution (API) ou on les fige dans un export au moment du build ?
- Comment évoluent les lieux : tirés au hasard parmi tous les univers, ou liés aux univers des decks ?
- Un nouveau joueur a-t-il assez de cartes distinctes pour composer 12 cartes dès ses premiers jours ?
- Que devient une carte vendue ou échangée alors qu'elle est dans un deck : le deck devient invalide, ou on bloque la vente ?
- Le slug de Bleach est temporairement `benj-reviens` en prod ; les données de jeu gardent `b` (manifeste) jusqu'à la synchronisation avec ytcg.
- Valeurs des capacités : première version à relire dans `cards.md`, à rejouer en vrai.
