import type { CardView, GameResult, PlayerIndex, PlayerView } from '@ytcg-game/engine';
import type { Outcome } from '@ytcg-game/server/protocol';

export type Verdict = 'won' | 'lost' | 'tie';
export type ResultKind = 'win' | 'loss' | 'draw';

export interface LocationRow {
  index: number;
  defId: string | null;
  chosenBy: 'you' | 'opponent' | null;
  you: number;
  opponent: number;
  verdict: Verdict;
}

export function resultKind(outcome: Outcome, you: PlayerIndex): ResultKind {
  if (outcome.winner === null) {
    return 'draw';
  }
  return outcome.winner === you ? 'win' : 'loss';
}

export const RESULT_TITLE: Record<ResultKind, string> = { win: 'Victoire', loss: 'Défaite', draw: 'Égalité' };

function verdictOf(winner: PlayerIndex | null | undefined, you: PlayerIndex): Verdict {
  if (winner === null || winner === undefined) {
    return 'tie';
  }
  return winner === you ? 'won' : 'lost';
}

// One row per location, from the engine result (never recomputed from the powers).
export function locationRows(view: PlayerView, result: GameResult | null): LocationRow[] {
  if (result === null) {
    return [];
  }
  return view.locations.map(({ index, defId, chosenBy }) => {
    const [first = 0, second = 0] = result.locationPowers[index] ?? [];
    const mine = view.you === 0 ? first : second;
    return {
      index,
      defId,
      chosenBy,
      you: mine,
      opponent: view.you === 0 ? second : first,
      verdict: verdictOf(result.locationWinners[index], view.you),
    };
  });
}

// Total power of the final board: yours then the opponent's.
export function totalPower(result: GameResult | null, you: PlayerIndex): { you: number; opponent: number } | null {
  if (result === null) {
    return null;
  }
  const [first, second] = result.totalPower;
  return you === 0 ? { you: first, opponent: second } : { you: second, opponent: first };
}

function plural(count: number): string {
  return `${String(count)} lieu${count > 1 ? 'x' : ''}`;
}

function scoreSubtitle(kind: ResultKind, rows: readonly LocationRow[], opponent: string): string {
  const won = rows.filter((row) => row.verdict === 'won').length;
  const lost = rows.filter((row) => row.verdict === 'lost').length;
  const total = String(rows.length);
  if (kind === 'draw') {
    return `Même nombre de lieux, même puissance totale face à ${opponent}`;
  }
  if (kind === 'win') {
    return won > lost
      ? `Tu remportes ${plural(won)} sur ${total} face à ${opponent}`
      : `À égalité de lieux, ta puissance totale t’offre la victoire face à ${opponent}`;
  }
  return lost > won
    ? `${opponent} remporte ${plural(lost)} sur ${total}`
    : `À égalité de lieux, la puissance totale donne la victoire à ${opponent}`;
}

export function resultSubtitle(
  outcome: Outcome,
  you: PlayerIndex,
  rows: readonly LocationRow[],
  opponent: string,
): string {
  if (outcome.reason === 'forfeit') {
    return outcome.winner === you ? `${opponent} a quitté la partie.` : 'Partie abandonnée.';
  }
  return scoreSubtitle(resultKind(outcome, you), rows, opponent);
}

export interface DecisiveCard {
  card: CardView;
  location: number;
}

// The most powerful card of the winner on a location the winner took (first one on a tie); none for a draw.
export function decisiveCard(view: PlayerView, result: GameResult | null): DecisiveCard | null {
  const winner = result?.winner ?? null;
  if (result === null || winner === null) {
    return null;
  }
  const side = winner === view.you ? 'you' : 'opponent';
  return view.locations
    .filter((location) => result.locationWinners[location.index] === winner)
    .flatMap((location) => location.cards[side].map((card) => ({ card, location: location.index })))
    .reduce<DecisiveCard | null>(
      (best, next) => (best === null || next.card.power > best.card.power ? next : best),
      null,
    );
}
