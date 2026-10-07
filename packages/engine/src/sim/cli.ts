import { parseArgs } from 'node:util';
import { loadDataDir } from './data.ts';
import { type DeckMode, simulate, winRate } from './simulate.ts';

const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '1000' },
    seed: { type: 'string', default: 'sim' },
    mode: { type: 'string', default: 'random' },
    top: { type: 'string', default: '10' },
  },
});

const mode = values.mode as DeckMode;
if (mode !== 'random' && mode !== 'universe') {
  console.error('--mode must be "random" or "universe"');
  process.exit(1);
}

const catalog = loadDataDir();
const games = Number(values.games);
const top = Number(values.top);
const started = performance.now();
const report = simulate(catalog, { games, seed: values.seed, mode });
const elapsed = Math.round(performance.now() - started);
const percent = (value: number): string => `${(value * 100).toFixed(1)} %`;

console.log(`${games} parties (decks ${mode}, graine "${values.seed}") en ${elapsed} ms`);
console.log(`Victoires siège 0 : ${percent(report.seatWins[0] / games)} · siège 1 : ${percent(report.seatWins[1] / games)} · nuls : ${percent(report.draws / games)}`);
console.log(`Cartes posées par joueur et par partie : ${report.averageCardsPlayed.toFixed(1)}`);

if (report.universes.size > 0) {
  console.log('\nUnivers (deck mono-univers) :');
  for (const [universe, entry] of [...report.universes].sort((a, b) => winRate(b[1]) - winRate(a[1]))) {
    console.log(`  ${universe.padEnd(22)} ${percent(winRate(entry)).padStart(8)}  (${entry.games} decks)`);
  }
}

const minGames = Math.max(5, Math.floor((games * 2 * 12) / catalog.cards.size / 4));
const ranked = [...report.cards]
  .filter(([, entry]) => entry.games >= minGames)
  .sort((a, b) => winRate(b[1]) - winRate(a[1]));
const line = ([id, entry]: [string, { games: number; wins: number }]): string => {
  const card = catalog.card(id);
  return `  ${percent(winRate(entry)).padStart(8)}  ${card.cost}/${String(card.power).padEnd(3)} ${card.rarity.padEnd(10)} ${card.name} (${card.extension}, ${entry.games} decks)`;
};
console.log(`\nMeilleures cartes (≥ ${minGames} decks) :`);
ranked.slice(0, top).forEach((entry) => console.log(line(entry)));
console.log('\nPires cartes :');
ranked.slice(-top).reverse().forEach((entry) => console.log(line(entry)));
