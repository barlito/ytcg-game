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

// « Code d'un ami » and « Rejoindre » in one combined field.
function JoinForm({ disabled, onJoin }: { disabled: boolean; onJoin: (code: string) => void }): React.JSX.Element {
  const [code, setCode] = useState('');
  const empty = code.trim() === '';
  return (
    <form
      className="join-field"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && !empty) {
          onJoin(code);
        }
      }}
    >
      <label className="join-field__input">
        <span>Code d’un ami</span>
        <input
          placeholder="K7-Q2X"
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
          }}
        />
      </label>
      <button type="submit" className="join-field__go" disabled={disabled || empty}>
        Rejoindre
      </button>
    </form>
  );
}

export function PlayActions({ options, onCreate, onJoin }: Props): React.JSX.Element {
  return (
    <div className="play">
      <span className="btn-glow">
        <button
          type="button"
          className="btn-arcade btn-lg"
          disabled={options === null}
          onClick={() => {
            if (options !== null) {
              onCreate(options());
            }
          }}
        >
          Créer une partie
        </button>
      </span>
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
