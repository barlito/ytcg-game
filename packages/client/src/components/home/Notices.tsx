import { Notched } from '../ui/Notched.tsx';

interface Props {
  message: string;
  onRetry: () => void;
}

export function LoginPrompt({ message, loginUrl, onRetry }: Props & { loginUrl: string }): React.JSX.Element {
  return (
    <Notched className="notice">
      <p>{message}</p>
      <div className="home-actions">
        <span className="btn-glow">
          <a className="btn-arcade" href={loginUrl}>
            Se connecter sur Youl TCG
          </a>
        </span>
        <button type="button" className="btn-ghost" onClick={onRetry}>
          Réessayer
        </button>
      </div>
    </Notched>
  );
}

export function Unavailable({ message, onRetry }: Props): React.JSX.Element {
  return (
    <Notched className="notice">
      <p>{message}</p>
      <button type="button" className="btn-ghost" onClick={onRetry}>
        Réessayer
      </button>
    </Notched>
  );
}
