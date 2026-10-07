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
