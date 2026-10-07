import type { Catalog } from '../catalog.ts';
import { createGame } from '../game.ts';
import { DECK_SIZE } from '../rules.ts';
import { Rng, seedFromString } from '../rng.ts';
import { PLAYERS } from '../state.ts';
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

function buildDeck(catalog: Catalog, rng: Rng, mode: DeckMode): { deck: string[]; universe: string | null } {
  const cards = [...catalog.cards.values()];
  if (mode === 'random') {
    return { deck: rng.shuffle(cards.map((card) => card.id)).slice(0, DECK_SIZE), universe: null };
  }
  const universes = [...new Set(cards.map((card) => card.extension))]
    .sort()
    .filter((universe) => cards.filter((card) => card.extension === universe).length >= DECK_SIZE);
  const universe = rng.pick(universes);
  const pool = cards.filter((card) => card.extension === universe).map((card) => card.id);
  return { deck: rng.shuffle(pool).slice(0, DECK_SIZE), universe };
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
    const decks = PLAYERS.map(() => buildDeck(catalog, rng, options.mode));
    let { state } = createGame(catalog, {
      seed: `${options.seed}:${game}`,
      players: [
        { id: 'bot-0', deck: decks[0]?.deck ?? [] },
        { id: 'bot-1', deck: decks[1]?.deck ?? [] },
      ],
    });
    while (state.status === 'playing') {
      for (const player of PLAYERS) {
        state = playRandomTurn(catalog, state, player, rng);
      }
    }

    const winner = state.result?.winner ?? null;
    if (winner === null) {
      report.draws++;
    } else {
      report.seatWins[winner]++;
    }
    for (const player of PLAYERS) {
      const won = winner === player;
      for (const card of Object.values(state.cards)) {
        if (card.owner === player) {
          tally(report.cards, card.defId, won);
        }
        if (card.owner === player && (card.zone === 'board' || card.zone === 'destroyed')) {
          cardsPlayed++;
        }
      }
      const universe = decks[player]?.universe;
      if (universe !== null && universe !== undefined) {
        tally(report.universes, universe, won);
      }
    }
  }

  report.averageCardsPlayed = cardsPlayed / (options.games * 2);
  return report;
}

export function winRate(entry: Tally): number {
  return entry.games === 0 ? 0 : entry.wins / entry.games;
}

