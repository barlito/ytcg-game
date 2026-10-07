import type { Catalog } from '../catalog.ts';
import { createGame } from '../game.ts';
import { buildRandomDeck } from '../deck.ts';
import { Rng, seedFromString } from '../rng.ts';
import { type GameState, PLAYERS } from '../state.ts';
import { playRandomTurn } from './bot.ts';

export type DeckMode = 'random' | 'universe';

export interface SimulationOptions {
  games: number;
  seed: string;
  mode: DeckMode;
}

export interface Tally {
  games: number;
  wins: number;
}

export interface SimulationReport {
  games: number;
  seatWins: [number, number];
  draws: number;
  averageCardsPlayed: number;
  cards: Map<string, Tally>;
  universes: Map<string, Tally>;
}

function tally(map: Map<string, Tally>, key: string, won: boolean): void {
  const entry = map.get(key) ?? { games: 0, wins: 0 };
  entry.games++;
  entry.wins += won ? 1 : 0;
  map.set(key, entry);
}

function buildDeck(catalog: Catalog, rng: Rng, mode: DeckMode): SimulatedDeck {
  const location = rng.pick([...catalog.locations.keys()]);
  if (mode === 'random') {
    return { deck: buildRandomDeck(catalog, rng) ?? [], universe: null, location };
  }
  const universe = rng.pick(buildableUniverses(catalog));
  const pool = [...catalog.cards.values()].filter((card) => card.extension === universe).map((card) => card.id);
  return { deck: buildRandomDeck(catalog, rng, pool) ?? [], universe, location };
}

const buildable = new WeakMap<Catalog, string[]>();

// Universes able to field a curve-legal deck on their own (tried with a few seeds), computed once per catalog.
function buildableUniverses(catalog: Catalog): string[] {
  const known = buildable.get(catalog);
  if (known !== undefined) {
    return known;
  }
  const cards = [...catalog.cards.values()];
  const universes = [...new Set(cards.map((card) => card.extension))].sort().filter((universe) => {
    const pool = cards.filter((card) => card.extension === universe).map((card) => card.id);
    return [1, 2, 3].every((seed) => buildRandomDeck(catalog, new Rng({ s: seed }), pool) !== null);
  });
  buildable.set(catalog, universes);
  return universes;
}

interface SimulatedDeck {
  deck: string[];
  universe: string | null;
  location: string;
}

export function simulate(catalog: Catalog, options: SimulationOptions): SimulationReport {
  const report: SimulationReport = {
    games: options.games,
    seatWins: [0, 0],
    draws: 0,
    averageCardsPlayed: 0,
    cards: new Map(),
    universes: new Map(),
  };
  let cardsPlayed = 0;
  for (let game = 0; game < options.games; game++) {
    const rng = new Rng({ s: seedFromString(`${options.seed}:${game}:bots`) });
    const decks: [SimulatedDeck, SimulatedDeck] = [
      buildDeck(catalog, rng, options.mode),
      buildDeck(catalog, rng, options.mode),
    ];
    const state = playGame(catalog, `${options.seed}:${game}`, decks, rng);
    cardsPlayed += recordGame(report, state, decks);
  }
  report.averageCardsPlayed = cardsPlayed / (options.games * 2);
  return report;
}

function playGame(catalog: Catalog, seed: string, decks: [SimulatedDeck, SimulatedDeck], rng: Rng): GameState {
  let { state } = createGame(catalog, {
    seed,
    players: [
      { id: 'bot-0', deck: decks[0].deck, location: decks[0].location },
      { id: 'bot-1', deck: decks[1].deck, location: decks[1].location },
    ],
  });
  while (state.status === 'playing') {
    for (const player of PLAYERS) {
      state = playRandomTurn(catalog, state, player, rng);
    }
  }
  return state;
}

// Adds one finished game to the report and returns how many cards were played in it.
function recordGame(report: SimulationReport, state: GameState, decks: [SimulatedDeck, SimulatedDeck]): number {
  const winner = state.result?.winner ?? null;
  if (winner === null) {
    report.draws++;
  } else {
    report.seatWins[winner]++;
  }
  for (const card of Object.values(state.cards)) {
    tally(report.cards, card.defId, winner === card.owner);
  }
  for (const player of PLAYERS) {
    const { universe } = decks[player];
    if (universe !== null) {
      tally(report.universes, universe, winner === player);
    }
  }
  return Object.values(state.cards).filter((card) => card.zone === 'board' || card.zone === 'destroyed').length;
}

export function winRate(entry: Tally): number {
  return entry.games === 0 ? 0 : entry.wins / entry.games;
}
