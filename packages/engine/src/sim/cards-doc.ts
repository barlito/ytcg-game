import { STATUS_IDS, statusRule } from '../abilities/statuses.ts';
import type { Catalog, Rarity } from '../catalog.ts';
import { describeCard, describeLocation, tagLabel } from '../describe.ts';

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'commune',
  uncommon: 'peu commune',
  rare: 'rare',
  legendary: 'légendaire',
};
const RARITY_ORDER: Rarity[] = ['legendary', 'rare', 'uncommon', 'common'];

function cell(text: string): string {
  return text.replaceAll('|', '\\|');
}

// Generated review page: every card and location with its effect text, as a player would read it.
export function renderCardsDoc(catalog: Catalog): string {
  const lines = [
    '# Cartes et lieux du jeu',
    '',
    '> Page générée par `make cards-doc` depuis `data/` — ne pas modifier à la main.',
    '',
    '## États',
    '',
    ...STATUS_IDS.map((id) => {
      const { name, rule } = statusRule(id);
      return `- **${name}** (\`${id}\`)${rule === undefined ? " : sans règle propre, lu par d'autres cartes" : ` : ${rule}`}`;
    }),
    '',
  ];

  const universes = [...catalog.extensions].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  for (const [slug, name] of universes) {
    const cards = [...catalog.cards.values()]
      .filter((card) => card.extension === slug)
      .sort(
        (a, b) =>
          RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) ||
          a.cost - b.cost ||
          a.name.localeCompare(b.name, 'fr'),
      );
    const withEffect = cards.filter((card) => card.abilities.length > 0 || card.statuses.length > 0).length;
    lines.push(`## ${name} (\`${slug}\`) — ${cards.length} cartes, ${withEffect} avec effet`, '');
    lines.push('| Carte | Rareté | Coût | Puiss. | Tags | Effet |', '|---|---|---|---|---|---|');
    for (const card of cards) {
      const rarity = `${RARITY_LABEL[card.rarity]}${card.unique ? ' ★ 1/1' : ''}`;
      const tags = card.tags
        .filter((tag) => !tag.startsWith('universe:'))
        .map((tag) => tagLabel(catalog, tag))
        .join(', ');
      const effect = describeCard(catalog, card).join('<br>') || '—';
      lines.push(`| ${cell(card.name)} | ${rarity} | ${card.cost} | ${card.power} | ${cell(tags)} | ${cell(effect)} |`);
    }
    lines.push('');
  }

  lines.push('## Lieux', '', '| Lieu | Univers | Effet |', '|---|---|---|');
  for (const location of [...catalog.locations.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'))) {
    const universe =
      location.extension === null ? '—' : (catalog.extensions.get(location.extension) ?? location.extension);
    lines.push(
      `| ${cell(location.name)} | ${cell(universe)} | ${cell(describeLocation(catalog, location).join('<br>') || '—')} |`,
    );
  }
  lines.push('');

  return lines.join('\n');
}
