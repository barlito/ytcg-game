import type { PlayerView } from '@ytcg-game/engine';
import { Toast } from './ui/Toast.tsx';

interface Props {
  view: PlayerView;
  // Last journal line already played by the replay.
  lastLine: string | undefined;
  onEndTurn: () => void;
  onMulligan: () => void;
}

function EndTurn({ view, onEndTurn }: Pick<Props, 'view' | 'onEndTurn'>): React.JSX.Element {
  if (view.status === 'ended') {
    return <span className="status-ended">Partie terminée</span>;
  }
  return (
    <span className="btn-glow">
      <button type="button" className="btn-arcade btn-lg end-turn" disabled={view.ready} onClick={onEndTurn}>
        {view.ready ? 'En attente de l’adversaire…' : 'Fin du tour'}
      </button>
    </span>
  );
}

// Bottom right: the last journal line as a toast, the redraw and the end of turn.
export function TurnActions({ view, lastLine, onEndTurn, onMulligan }: Props): React.JSX.Element {
  return (
    <section className="turn-actions" aria-label="Actions du tour">
      {lastLine !== undefined && (
        <div className="turn-actions__toast">
          <Toast title="Journal">{lastLine}</Toast>
        </div>
      )}
      {view.canMulligan && (
        <button type="button" className="btn-ghost" onClick={onMulligan}>
          Repiocher ma main
        </button>
      )}
      <EndTurn view={view} onEndTurn={onEndTurn} />
    </section>
  );
}
