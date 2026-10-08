interface Props {
  message: string;
  onRetry: () => void;
}

export function LoginPrompt({ message, loginUrl, onRetry }: Props & { loginUrl: string }): React.JSX.Element {
  return (
    <section className="notice">
      <p>{message}</p>
      <div className="home-actions">
        <a className="btn-arcade" href={loginUrl}>
          Se connecter sur Youl TCG
        </a>
        <button type="button" className="btn-ghost" onClick={onRetry}>
          Réessayer
        </button>
      </div>
    </section>
  );
}

export function Unavailable({ message, onRetry }: Props): React.JSX.Element {
  return (
    <section className="notice">
      <p>{message}</p>
      <button type="button" className="btn-ghost" onClick={onRetry}>
        Réessayer
      </button>
    </section>
  );
}
