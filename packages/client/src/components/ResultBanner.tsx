import type { PlayerIndex } from '@ytcg-game/engine';
import type { Outcome } from '@ytcg-game/server/protocol';

interface Props {
  outcome: Outcome;
  you: PlayerIndex;
  onLeave: () => void;
}

function title(outcome: Outcome, you: PlayerIndex): string {
  if (outcome.winner === null) {
    return 'Match nul';
  }
  return outcome.winner === you ? 'Victoire !' : 'Défaite';
}

export function ResultBanner({ outcome, you, onLeave }: Props): React.JSX.Element {
  return (
    <div className="result">
      <h2 className={outcome.winner === you ? 'is-win' : ''}>{title(outcome, you)}</h2>
      {outcome.reason === 'forfeit' && (
        <p>{outcome.winner === you ? "L'adversaire a quitté la partie." : 'Partie abandonnée.'}</p>
      )}
      <button type="button" className="btn-arcade" onClick={onLeave}>
        Retour
      </button>
    </div>
  );
}
