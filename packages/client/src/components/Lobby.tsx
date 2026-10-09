interface Props {
  code: string;
  onLeave: () => void;
}

export function Lobby({ code, onLeave }: Props): React.JSX.Element {
  return (
    <main className="lobby">
      <h2 className="eyebrow">En attente d&apos;un adversaire</h2>
      <p>Envoie ce code à ton ami :</p>
      <button
        type="button"
        className="code"
        title="Copier"
        onClick={() => {
          void navigator.clipboard.writeText(code);
        }}
      >
        {code}
      </button>
      <p>Touche le code pour le copier.</p>
      <button type="button" className="btn-ghost" onClick={onLeave}>
        Annuler
      </button>
    </main>
  );
}
