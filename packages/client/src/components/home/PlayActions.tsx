import type { JoinOptions } from '@ytcg-game/server/protocol';
import { useState } from 'react';

export interface PlayHandlers {
  onCreate: (options: JoinOptions) => void;
  onJoin: (code: string, options: JoinOptions) => void;
}

interface Props extends PlayHandlers {
  // Built at click time; null disables both actions.
  options: (() => JoinOptions) | null;
}

function JoinForm({ disabled, onJoin }: { disabled: boolean; onJoin: (code: string) => void }): React.JSX.Element {
  const [code, setCode] = useState('');
  return (
    <div className="join">
      <input
        placeholder="Code de la partie"
        aria-label="Code de la partie"
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
        }}
      />
      <button
        type="button"
        className="btn-arcade"
        disabled={disabled || code.trim() === ''}
        onClick={() => {
          onJoin(code);
        }}
      >
        Rejoindre
      </button>
    </div>
  );
}

export function PlayActions({ options, onCreate, onJoin }: Props): React.JSX.Element {
  return (
    <div className="home-actions">
      <button
        type="button"
        className="btn-arcade"
        disabled={options === null}
        onClick={() => {
          if (options !== null) {
            onCreate(options());
          }
        }}
      >
        Créer une partie
      </button>
      <JoinForm
        disabled={options === null}
        onJoin={(code) => {
          if (options !== null) {
            onJoin(code, options());
          }
        }}
      />
    </div>
  );
}
