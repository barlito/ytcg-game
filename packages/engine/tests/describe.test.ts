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
