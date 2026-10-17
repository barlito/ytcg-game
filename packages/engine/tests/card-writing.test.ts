import { describe, expect, it } from 'vitest';
import { describeCard } from '../src/index.ts';
import { loadDataDir } from '../src/sim/data.ts';

// Legacy lines shared by several extensions (« Règle d'écriture des cartes »): this list only shrinks, one
// extension rewrite at a time. A new duplicate or a line no longer duplicated makes the test fail.
const LEGACY_DUPLICATES: readonly string[] = [
  'En continu : +1 puissance aux autres cartes alliées ici.',
  'En continu : +1 puissance aux autres cartes machine alliées sur le plateau.',
  'En continu : +1 puissance par autre carte Benj sur le plateau.',
  'En continu : +1 puissance par autre carte Linette alliée sur le plateau.',
  'En continu : +1 puissance par autre carte alliée ici.',
  'En continu : +1 puissance par autre carte folle sur le plateau.',
  'En continu : +2 puissance aux autres cartes Benj sur le plateau.',
  'En continu : +2 puissance aux autres cartes machine alliées sur le plateau.',
  'En continu : +2 puissance par autre carte Linette alliée ici.',
  'En continu : +2 puissance par autre carte Linette alliée sur le plateau.',
  'En continu : +2 puissance par autre carte folle sur le plateau.',
  "En continu : s'il n'y a aucune autre carte alliée ici, +3 puissance.",
  "En continu : s'il n'y a aucune autre carte alliée ici, +4 puissance.",
  'En continu : −1 puissance aux cartes ennemies ici.',
  "En fin de tour : +1 puissance à l'autre carte alliée la plus faible ici.",
  'En fin de tour : +1 puissance.',
  'Folle : +1 puissance.',
  'Folle : +2 puissance.',
  'À la révélation : +2 puissance aux autres cartes alliées ici.',
  'À la révélation : +2 puissance par autre carte ici.',
  'À la révélation : +3 puissance et devient défoncée.',
  'À la révélation : +3 puissance à une autre carte alliée ici au hasard et la rend défoncée.',
  'À la révélation : devient folle.',
  'À la révélation : détruit la carte ennemie la plus faible ici.',
  'À la révélation : détruit les autres cartes alliées ici.',
  'À la révélation : détruit les autres cartes ici.',
  'À la révélation : pioche 1 carte.',
  'À la révélation : pioche 2 cartes.',
  'À la révélation : rend les autres cartes ici folles.',
  'À la révélation : rend les cartes ennemies ici folles.',
  'À la révélation : −1 puissance aux cartes ennemies ici.',
  'À la révélation : −2 puissance aux cartes ennemies ici.',
  'À la révélation : −2 puissance à la carte ennemie la plus forte ici et la rend folle.',
  'À la révélation : −2 puissance à la carte ennemie la plus forte ici.',
];

// Extensions already rewritten around their signature: none of their lines may be a legacy duplicate.
const REWRITTEN_EXTENSIONS: readonly string[] = ['psychedelic'];

// Generated ability line → extensions printing it (innate status keywords like « Coriace (…) » excluded).
function linesByExtension(): Map<string, Set<string>> {
  const catalog = loadDataDir();
  const lines = new Map<string, Set<string>>();
  for (const card of catalog.cards.values()) {
    for (const line of describeCard(catalog, card).slice(card.statuses.length)) {
      const extensions = lines.get(line) ?? new Set<string>();
      extensions.add(card.extension);
      lines.set(line, extensions);
    }
  }
  return lines;
}

describe('card-writing rule', () => {
  const duplicated = [...linesByExtension()]
    .filter(([, extensions]) => extensions.size > 1)
    .map(([line]) => line)
    .sort();

  it('never prints the same ability line in two extensions (outside the legacy allow-list)', () => {
    expect(duplicated.filter((line) => !LEGACY_DUPLICATES.includes(line))).toEqual([]);
  });

  it('keeps the rewritten extensions out of the allow-list', () => {
    const lines = linesByExtension();
    const rewritten = LEGACY_DUPLICATES.filter((line) =>
      REWRITTEN_EXTENSIONS.some((extension) => lines.get(line)?.has(extension)),
    );
    expect(rewritten).toEqual([]);
  });

  it('has no stale entry in the legacy allow-list', () => {
    expect(LEGACY_DUPLICATES.filter((line) => !duplicated.includes(line))).toEqual([]);
  });
});
