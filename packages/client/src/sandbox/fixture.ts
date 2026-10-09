import type {
  CardDefinition,
  CardView,
  Catalog,
  GameResult,
  LocationView,
  PlayerView,
  StatusId,
} from '@ytcg-game/engine';
import type { GameMessage, Outcome, SeatInfo } from '@ytcg-game/server/protocol';

export type Ending = 'none' | 'win' | 'loss' | 'draw';

export interface FixtureOptions {
  // Cards in your hand, 0-7.
  handCount: number;
  turn: number;
  ending: Ending;
  // Adds the reveal events of one board card, so the real replay plays it.
  replay: boolean;
}

export const DEFAULT_OPTIONS: FixtureOptions = { handCount: 7, turn: 4, ending: 'none', replay: false };

const SEATS: SeatInfo[] = [
  { name: 'Toi', connected: true },
  { name: 'Adversaire', connected: true },
];
const TURN_SECONDS = 45;
const HAND_COSTS = [1, 1, 2, 3, 3, 5, 6];

interface Tweak {
  delta?: number;
  statuses?: Partial<Record<StatusId, number>>;
}

interface Rows {
  you: CardView[];
  opponent: CardView[];
  pending: CardView[];
}

function sorted(catalog: Catalog): CardDefinition[] {
  return [...catalog.cards.values()].sort((a, b) => a.id.localeCompare(b.id));
}

// The n-th card matching a predicate, wrapping around so the fixture works on any catalog.
function nth(cards: readonly CardDefinition[], match: (card: CardDefinition) => boolean, n: number): CardDefinition {
  const found = cards.filter(match);
  const card = found[n % found.length] ?? cards[n % cards.length];
  if (card === undefined) {
    throw new RangeError('the catalog has no card');
  }
  return card;
}

function viewOf(definition: CardDefinition, uid: string, tweak: Tweak = {}): CardView {
  const modifier = tweak.delta ?? 0;
  return {
    uid,
    defId: definition.id,
    cost: definition.cost,
    power: Math.max(0, definition.power + modifier),
    breakdown: { printed: definition.power, modifier, ongoing: [] },
    statuses: tweak.statuses ?? {},
  };
}

// Location 0 holds four cards a side (a legendary, a unique, buffed / weakened cards, statuses).
function boardRows(catalog: Catalog): Rows[] {
  const all = sorted(catalog);
  const cost = (value: number, n = 0): CardDefinition => nth(all, (card) => card.cost === value && !card.unique, n);
  const rarity = (name: string, n = 0): CardDefinition => nth(all, (card) => card.rarity === name && !card.unique, n);
  return [
    {
      you: [
        viewOf(rarity('legendary'), 'y0', { delta: 2 }),
        viewOf(cost(1), 'y1'),
        viewOf(cost(3), 'y2', { statuses: { tough: 1 } }),
        viewOf(cost(2), 'y3', { delta: -1, statuses: { high: 2, mad: 1 } }),
      ],
      opponent: [
        viewOf(
          nth(all, (card) => card.unique, 0),
          'o0',
        ),
        viewOf(cost(4), 'o1', { delta: 3, statuses: { mad: 1 } }),
        viewOf(cost(1, 1), 'o2'),
        viewOf(rarity('uncommon', 1), 'o3', { delta: -2 }),
      ],
      pending: [],
    },
    {
      you: [viewOf(cost(2, 1), 'y4'), viewOf(rarity('rare', 1), 'y5', { delta: 1 })],
      opponent: [viewOf(cost(5), 'o4')],
      pending: [viewOf(cost(2, 2), 'p0')],
    },
    {
      you: [viewOf(rarity('legendary', 1), 'y6')],
      opponent: [viewOf(cost(3, 1), 'o5'), viewOf(cost(1, 2), 'o6')],
      pending: [],
    },
  ];
}

function handCards(catalog: Catalog, count: number): CardView[] {
  const all = sorted(catalog);
  return HAND_COSTS.map((cost, i) =>
    viewOf(
      nth(all, (card) => card.cost === cost, i),
      `h${String(i)}`,
    ),
  ).slice(0, count);
}

function total(cards: readonly CardView[]): number {
  return cards.reduce((sum, card) => sum + card.power, 0);
}

// Hand-written scores per ending, so the result screen always agrees with itself.
const ENDING_POWERS: Record<Exclude<Ending, 'none'>, [number, number][]> = {
  win: [
    [12, 8],
    [9, 5],
    [4, 7],
  ],
  loss: [
    [7, 11],
    [3, 6],
    [8, 5],
  ],
  draw: [
    [8, 8],
    [6, 6],
    [5, 5],
  ],
};

function leader(you: number, opponent: number): 0 | 1 | null {
  if (you === opponent) {
    return null;
  }
  return you > opponent ? 0 : 1;
}

function resultOf(ending: Exclude<Ending, 'none'>): GameResult {
  const powers = ENDING_POWERS[ending];
  const sum = (side: 0 | 1): number => powers.reduce((acc, pair) => acc + pair[side], 0);
  const totals: [number, number] = [sum(0), sum(1)];
  return {
    winner: leader(totals[0], totals[1]),
    locationWinners: powers.map(([you, opponent]) => leader(you, opponent)),
    locationPowers: powers,
    totalPower: totals,
  };
}

function locationViews(catalog: Catalog, rows: readonly Rows[], result: GameResult | null): LocationView[] {
  const ids = [...catalog.locations.keys()].sort();
  const chosen = ['you', 'opponent', null] as const;
  return rows.map((row, index) => {
    const shown = result?.locationPowers[index];
    return {
      index,
      defId: ids[index % ids.length] ?? null,
      chosenBy: chosen[index] ?? null,
      cards: { you: row.you, opponent: row.opponent },
      power:
        shown === undefined
          ? { you: total(row.you), opponent: total(row.opponent) }
          : { you: shown[0], opponent: shown[1] },
      yourPending: row.pending,
    };
  });
}

function outcomeOf(result: GameResult | null): Outcome | null {
  return result === null ? null : { winner: result.winner, reason: 'score' };
}

function viewOfGame(catalog: Catalog, options: FixtureOptions, rows: readonly Rows[]): PlayerView {
  const result = options.ending === 'none' ? null : resultOf(options.ending);
  const hand = handCards(catalog, options.handCount);
  const spent = rows.flatMap((row) => row.pending).reduce((sum, card) => sum + card.cost, 0);
  const energy = Math.min(options.turn, 6);
  const open = [0, 1, 2].filter((index) => (rows[index]?.you.length ?? 4) < 4);
  return {
    you: 0,
    turn: options.turn,
    maxTurns: 6,
    status: result === null ? 'playing' : 'ended',
    energy,
    spent,
    ready: false,
    canMulligan: false,
    hand,
    playableCards: result === null ? hand.filter((card) => card.cost <= energy - spent).map((card) => card.uid) : [],
    openLocations: result === null ? open : [],
    deckCount: 3,
    opponent: { id: 'sandbox', handCount: 4, deckCount: 2, pendingCount: 1, ready: false },
    locations: locationViews(catalog, rows, result),
    result,
  };
}

// A fabricated server message on the real catalog: nothing here talks to a server.
export function buildFixture(catalog: Catalog, options: FixtureOptions, now: number): GameMessage {
  const rows = boardRows(catalog);
  const view = viewOfGame(catalog, options, rows);
  const revealed = rows[0]?.you[0];
  return {
    seats: SEATS,
    view,
    events:
      options.replay && revealed !== undefined
        ? [{ type: 'cardRevealed', card: revealed.uid, defId: revealed.defId, player: 0, location: 0 }]
        : [],
    serverTime: now,
    turnDeadline: view.result === null ? now + TURN_SECONDS * 1000 : null,
    revealUntil: null,
    outcome: outcomeOf(view.result),
  };
}
