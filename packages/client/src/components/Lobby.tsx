import { useState } from 'react';

interface Props {
  code: string;
  onLeave: () => void;
}

// Clipboard API needs a secure context: fall back to selecting the text.
async function copyOrSelect(el: HTMLElement, code: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection?.addRange(range);
    return false;
  }
}

export function Lobby({ code, onLeave }: Props): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <main className="lobby">
      <h2 className="eyebrow">En attente d&apos;un adversaire</h2>
      <p>Envoie ce code à ton ami :</p>
      <button
        type="button"
        className="code"
        title="Copier"
        onClick={(e) => {
          void copyOrSelect(e.currentTarget, code).then(setCopied);
        }}
      >
        {code}
      </button>
      <p role="status">{copied ? 'Code copié !' : 'Touche le code pour le copier.'}</p>
      <button type="button" className="btn-ghost" onClick={onLeave}>
        Annuler
      </button>
    </main>
  );
}
