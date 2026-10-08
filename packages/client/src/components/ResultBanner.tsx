import type { PlayerIndex, PlayerView } from '@ytcg-game/engine';
import type { Outcome } from '@ytcg-game/server/protocol';

interface Props {
  outcome: Outcome;
  you: PlayerIndex;
  view: PlayerView;
  onLeave: () => void;
}

function title(outcome: Outcome, you: PlayerIndex): string {
  if (outcome.winner === null) {
    return 'Match nul';
  }
  return outcome.winner === you ? 'Victoire !' : 'Défaite';
}

// Locations won by each side on the final board.
function score(view: PlayerView): string {
  const won = (mine: boolean): number =>
    view.locations.filter(({ power }) => (mine ? power.you > power.opponent : power.opponent > power.you)).length;
  return `Lieux gagnés : ${won(true)} – ${won(false)}`;
}

// A panel over the top of the board, so the final board stays visible.
export function ResultBanner({ outcome, you, view, onLeave }: Props): React.JSX.Element {
  return (
    <div className="result" role="dialog" aria-label="Fin de la partie">
      <h2 className={outcome.winner === you ? 'is-win' : ''}>{title(outcome, you)}</h2>
      {outcome.reason === 'score' && <p className="result-score">{score(view)}</p>}
      {outcome.reason === 'forfeit' && (
        <p>{outcome.winner === you ? "L'adversaire a quitté la partie." : 'Partie abandonnée.'}</p>
      )}
      <button type="button" className="btn-arcade" onClick={onLeave}>
        Retour
      </button>
    </div>
  );
}
