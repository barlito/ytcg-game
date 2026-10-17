import { describe, expect, it } from 'vitest';
import { describeCard, describeLocation } from '../src/index.ts';
import { card, catalogWith } from './support.ts';

const catalog = catalogWith(
  [
    card('veli', {
      abilities: [
        { trigger: 'ongoing', condition: { type: 'count', max: 0 }, effect: { type: 'addPower', amount: 4 } },
      ],
    }),
    card('benj', {
      abilities: [
        {
          trigger: 'onReveal',
          target: { type: 'cards', side: 'all' },
          effect: [
            { type: 'addPower', amount: -1 },
            { type: 'addStatus', status: 'mad' },
          ],
        },
        {
          trigger: 'ongoing',
          target: { type: 'cards', side: 'all', tag: 'character:benj' },
          effect: { type: 'addPower', amount: 2 },
        },
      ],
    }),
    card('linette', {
      abilities: [
        {
          trigger: 'ongoing',
          effect: { type: 'addPowerPerCard', amount: 2, count: { scope: 'everywhere', tag: 'family:linette' } },
        },
      ],
    }),
    card('farf', {
      abilities: [
        { trigger: 'endOfTurn', target: { type: 'cards', pick: 'weakest' }, effect: { type: 'addPower', amount: 1 } },
        {
          trigger: 'onReveal',
          condition: { type: 'turn', min: 4 },
          target: { type: 'cards', side: 'enemy', scope: 'everywhere', pick: 'random' },
          effect: { type: 'removeStatus' },
        },
      ],
    }),
    card('barlito', { statuses: ['tough'], abilities: [{ trigger: 'onReveal', effect: { type: 'draw', count: 2 } }] }),
  ],
  [
    {
      id: 'loc-kda',
      name: 'Scène',
      abilities: [
        {
          trigger: 'ongoing',
          target: { type: 'cards', side: 'all', tag: 'universe:test' },
          effect: { type: 'addPower', amount: 2 },
        },
      ],
    },
    {
      id: 'loc-ruins',
      name: 'Ruines',
      abilities: [
        { trigger: 'onReveal', target: { type: 'cards', side: 'all' }, effect: { type: 'addStatus', status: 'mad' } },
        {
          trigger: 'ongoing',
          target: { type: 'cards', side: 'all', status: 'mad' },
          effect: { type: 'addPower', amount: 2 },
        },
        { trigger: 'endOfTurn', target: { type: 'cards', side: 'all' }, effect: { type: 'removeStatus' } },
        { trigger: 'onReveal', effect: { type: 'draw', count: 2 } },
      ],
    },
  ],
);

describe('effect text', () => {
  it('writes card abilities in French', () => {
    expect(describeCard(catalog, catalog.card('veli'))).toEqual([
      "En continu : s'il n'y a aucune autre carte alliée ici, +4 puissance.",
    ]);
    expect(describeCard(catalog, catalog.card('benj'))).toEqual([
      'À la révélation : −1 puissance aux autres cartes ici et les rend folles.',
      'En continu : +2 puissance aux autres cartes Benj ici.',
    ]);
    expect(describeCard(catalog, catalog.card('linette'))).toEqual([
      'En continu : +2 puissance par autre carte Linette alliée sur le plateau.',
    ]);
    expect(describeCard(catalog, catalog.card('farf'))).toEqual([
      "En fin de tour : +1 puissance à l'autre carte alliée la plus faible ici.",
      "À la révélation : à partir du tour 4, retire tous les états d'une carte ennemie sur le plateau au hasard.",
    ]);
    expect(describeCard(catalog, catalog.card('barlito'))).toEqual([
      'Coriace (ne peut être ni détruite ni affaiblie).',
      'À la révélation : pioche 2 cartes.',
    ]);
  });

  it('writes location abilities in French', () => {
    expect(describeLocation(catalog, catalog.location('loc-kda'))).toEqual([
      'En continu : +2 puissance aux cartes Test ici.',
    ]);
    expect(describeLocation(catalog, catalog.location('loc-ruins'))).toEqual([
      'À la révélation : rend les cartes ici folles.',
      'En continu : +2 puissance aux cartes folles ici.',
      'En fin de tour : retire tous les états des cartes ici.',
      'À la révélation : chaque joueur pioche 2 cartes.',
    ]);
  });
});

describe('text of the building blocks', () => {
  const bricks = catalogWith(
    [
      card('benj', { tags: ['character:benj'] }),
      card('mover', {
        abilities: [
          { trigger: 'onReveal', effect: { type: 'move' } },
          {
            trigger: 'endOfTurn',
            target: { type: 'cards', side: 'enemy', pick: 'weakest' },
            effect: { type: 'move', destination: 'right' },
          },
          {
            trigger: 'onReveal',
            target: { type: 'cards' },
            effect: [
              { type: 'addPower', amount: 1 },
              { type: 'move', destination: 'left' },
            ],
          },
        ],
      }),
      card('watcher', {
        abilities: [
          {
            trigger: 'onCardPlayedHere',
            played: { side: 'ally', tag: 'character:benj' },
            effect: { type: 'addPower', amount: 2 },
          },
          { trigger: 'onCardPlayedHere', effect: { type: 'addPower', amount: 1 } },
          { trigger: 'onCardPlayedHere', played: { side: 'enemy', status: 'high' }, effect: { type: 'draw' } },
        ],
      }),
      card('sprinter', {
        abilities: [{ trigger: 'onMoved', effect: { type: 'addPower', amount: 2 } }],
      }),
      card('phoenix', {
        abilities: [
          { trigger: 'onDestroyed', effect: { type: 'addToHand', count: 2 } },
          { trigger: 'onDestroyed', effect: [{ type: 'draw' }, { type: 'addToHand', card: 'benj' }] },
        ],
      }),
      card('tailor', {
        abilities: [
          { trigger: 'onReveal', effect: { type: 'addCost', amount: -1 } },
          { trigger: 'onReveal', effect: { type: 'addCost', amount: 2, tag: 'character:benj' } },
          { trigger: 'onReveal', effect: { type: 'addCost', amount: -2, cards: 'next' } },
          { trigger: 'onReveal', effect: { type: 'addCost', amount: -1, cards: 'next', tag: 'character:benj' } },
        ],
      }),
      card('drunkard', { statuses: ['drunk', 'protected', 'overheat'] }),
      card('thief', {
        abilities: [
          {
            trigger: 'onReveal',
            target: { type: 'cards', side: 'enemy', pick: 'strongest' },
            effect: { type: 'stealPower', amount: 2 },
          },
          {
            trigger: 'endOfTurn',
            target: { type: 'cards', side: 'enemy' },
            effect: [
              { type: 'addStatus', status: 'high' },
              { type: 'stealPower', amount: 1 },
            ],
          },
        ],
      }),
      card('judge', {
        abilities: [
          {
            trigger: 'endOfTurn',
            condition: { type: 'location', result: 'winning' },
            effect: { type: 'addPower', amount: 1 },
          },
          { trigger: 'onReveal', condition: { type: 'location', result: 'losing' }, effect: { type: 'draw' } },
          {
            trigger: 'onMoved',
            condition: { type: 'location', result: 'tied' },
            effect: { type: 'addPower', amount: 2 },
          },
        ],
      }),
      card('picky', {
        abilities: [
          {
            trigger: 'onReveal',
            target: { type: 'cards', side: 'enemy', maxCost: 1, minCost: 1 },
            effect: { type: 'destroy' },
          },
          {
            trigger: 'onReveal',
            condition: { type: 'count', side: 'all', scope: 'everywhere', minPower: 9 },
            effect: { type: 'addPower', amount: 2 },
          },
          {
            trigger: 'endOfTurn',
            effect: { type: 'addPowerPerCard', amount: 1, count: { minCost: 2, maxCost: 4, maxPower: 3 } },
          },
          {
            trigger: 'onReveal',
            target: { type: 'cards', side: 'enemy', minCost: 5, minPower: 2, maxPower: 4 },
            effect: { type: 'destroy' },
          },
        ],
      }),
      card('medic', {
        abilities: [
          {
            trigger: 'onReveal',
            target: { type: 'cards' },
            effect: { type: 'removeStatus', statuses: ['high', 'overheat'] },
          },
          { trigger: 'onReveal', effect: { type: 'removeStatus', statuses: ['drunk', 'mad', 'high'] } },
          {
            trigger: 'endOfTurn',
            target: { type: 'cards', pick: 'weakest' },
            effect: [
              { type: 'addPower', amount: 1 },
              { type: 'removeStatus', statuses: ['drunk'] },
            ],
          },
        ],
      }),
      card('stoker', {
        abilities: [
          {
            trigger: 'onReveal',
            target: { type: 'cards', side: 'enemy' },
            effect: { type: 'addStatus', status: 'overheat', stacks: 2 },
          },
          {
            trigger: 'onReveal',
            target: { type: 'cards', side: 'all' },
            effect: { type: 'addStatus', status: 'overheat', anyCard: true },
          },
          {
            trigger: 'endOfTurn',
            target: { type: 'cards', pick: 'random' },
            effect: [
              { type: 'addPower', amount: 1 },
              { type: 'addStatus', status: 'overheat' },
            ],
          },
        ],
      }),
      card('tripper', {
        statuses: ['overheat'],
        abilities: [
          {
            trigger: 'ongoing',
            condition: { type: 'status', status: 'high' },
            effect: { type: 'addPower', amount: 3 },
          },
          {
            trigger: 'endOfTurn',
            condition: { type: 'status', status: 'high' },
            effect: { type: 'addPower', amount: 1 },
          },
          { trigger: 'onStatusGained', status: 'drunk', effect: { type: 'draw' } },
          {
            trigger: 'ongoing',
            condition: { type: 'status', status: 'overheat' },
            effect: { type: 'addPower', amount: 1 },
          },
        ],
      }),
    ],
    [
      {
        id: 'loc-rules',
        name: 'Règles',
        rules: { capacity: 3, openFromTurn: 2, closedFromTurn: 5 },
        abilities: [
          { trigger: 'onCardPlayedHere', effect: { type: 'addCost', amount: -1 } },
          { trigger: 'onReveal', effect: { type: 'addToHand', card: 'benj' } },
        ],
      },
    ],
  );

  it('writes moves', () => {
    expect(describeCard(bricks, bricks.card('mover'))).toEqual([
      'À la révélation : se déplace vers un autre lieu au hasard.',
      'En fin de tour : déplace la carte ennemie la plus faible ici vers le lieu de droite.',
      'À la révélation : +1 puissance aux autres cartes alliées ici et les déplace vers le lieu de gauche.',
    ]);
  });

  it('writes the trigger on played cards', () => {
    expect(describeCard(bricks, bricks.card('watcher'))).toEqual([
      'Quand une autre carte Benj alliée est jouée ici : +2 puissance.',
      'Quand une autre carte est jouée ici : +1 puissance.',
      'Quand une carte défoncée ennemie est jouée ici : pioche 1 carte.',
    ]);
  });

  it('writes destruction triggers and cards added to hand', () => {
    expect(describeCard(bricks, bricks.card('sprinter'))).toEqual(['Quand elle se déplace : +2 puissance.']);
    expect(describeCard(bricks, bricks.card('phoenix'))).toEqual([
      'Quand cette carte est détruite : ajoute 2 copies de cette carte en main.',
      'Quand cette carte est détruite : pioche 1 carte et ajoute « benj » en main.',
    ]);
  });

  it('writes cost changes', () => {
    expect(describeCard(bricks, bricks.card('tailor'))).toEqual([
      'À la révélation : les cartes en main coûtent 1 de moins.',
      'À la révélation : les cartes Benj en main coûtent 2 de plus.',
      'À la révélation : la prochaine carte jouée coûte 2 de moins.',
      'À la révélation : la prochaine carte Benj jouée coûte 1 de moins.',
    ]);
  });

  it('writes the new statuses as keywords', () => {
    const lines = describeCard(bricks, bricks.card('drunkard'));
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Ivresse');
    expect(lines[1]).toContain('Protection');
    expect(lines[2]).toContain('Surchauffe');
  });

  it('writes per-status abilities, and drops the default rule a card replaces', () => {
    expect(describeCard(bricks, bricks.card('tripper'))).toEqual([
      'Surchauffe.',
      'Défoncée : +3 puissance.',
      'En fin de tour, si elle est défoncée : +1 puissance.',
      'Quand elle devient ivre : pioche 1 carte.',
      'Surchauffée : +1 puissance.',
    ]);
  });

  it('says that Surchauffe only lands on machines, unless forced', () => {
    expect(describeCard(bricks, bricks.card('stoker'))).toEqual([
      'À la révélation : rend les cartes ennemies ici surchauffées (×2) (machines seulement).',
      'À la révélation : rend les autres cartes ici surchauffées.',
      'En fin de tour : +1 puissance à une autre carte alliée ici au hasard et la rend surchauffée (machines seulement).',
    ]);
  });

  it('writes power steals', () => {
    expect(describeCard(bricks, bricks.card('thief'))).toEqual([
      'À la révélation : vole 2 puissance à la carte ennemie la plus forte ici.',
      'En fin de tour : rend les cartes ennemies ici défoncées et leur vole 1 puissance.',
    ]);
  });

  it('writes the location result condition', () => {
    expect(describeCard(bricks, bricks.card('judge'))).toEqual([
      'En fin de tour : si vous gagnez ce lieu, +1 puissance.',
      'À la révélation : si vous perdez ce lieu, pioche 1 carte.',
      'Quand elle se déplace : si ce lieu est à égalité, +2 puissance.',
    ]);
  });

  it('writes cost and power filters', () => {
    expect(describeCard(bricks, bricks.card('picky'))).toEqual([
      'À la révélation : détruit les cartes ennemies à 1 de coût ici.',
      "À la révélation : s'il y a une autre carte avec 9 de puissance ou plus sur le plateau, +2 puissance.",
      'En fin de tour : +1 puissance par autre carte alliée de 2 à 4 de coût avec 3 de puissance ou moins ici.',
      'À la révélation : détruit les cartes ennemies à 5 de coût ou plus avec 2 à 4 de puissance ici.',
    ]);
  });

  it('lists the removed statuses', () => {
    expect(describeCard(bricks, bricks.card('medic'))).toEqual([
      'À la révélation : retire la Défonce et la Surchauffe des autres cartes alliées ici.',
      "À la révélation : retire l'Ivresse, la Folie et la Défonce de cette carte.",
      "En fin de tour : +1 puissance à l'autre carte alliée la plus faible ici et lui retire l'Ivresse.",
    ]);
  });

  it('writes location rules and their abilities', () => {
    expect(describeLocation(bricks, bricks.location('loc-rules'))).toEqual([
      'Chaque joueur ne peut poser que 3 cartes ici.',
      'Aucune carte ne peut être posée ici avant le tour 2.',
      'Plus aucune carte ne peut être posée ici à partir du tour 5.',
      'Quand une carte est jouée ici : les cartes en main de chaque joueur coûtent 1 de moins.',
      'À la révélation : chaque joueur reçoit « benj » en main.',
    ]);
  });
});
