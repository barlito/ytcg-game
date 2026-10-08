import type { YtcgSession } from '../ytcg/session.ts';
import { useYtcgSession } from '../ytcg/useYtcgSession.ts';
import { DeckHome } from './decks/DeckHome.tsx';
import { DevHome } from './home/DevHome.tsx';
import { LoginPrompt, Unavailable } from './home/Notices.tsx';
import type { PlayHandlers } from './home/PlayActions.tsx';
import { Title } from './home/Title.tsx';
import '../styles/decks.css';

interface Props extends PlayHandlers {
  error: string | null;
}

interface NoticeProps {
  session: Exclude<YtcgSession, { status: 'ready' }>;
  reload: () => void;
  handlers: PlayHandlers;
}

function SessionNotice({ session, reload, handlers }: NoticeProps): React.JSX.Element {
  switch (session.status) {
    case 'loading':
      return <p>Connexion à Youl TCG…</p>;
    case 'login':
      return <LoginPrompt message={session.message} loginUrl={session.loginUrl} onRetry={reload} />;
    case 'offline':
      // Standalone development keeps the random deck; in production the server only accepts ytcg decks.
      return import.meta.env.DEV ? (
        <DevHome {...handlers} />
      ) : (
        <Unavailable message={session.message} onRetry={reload} />
      );
  }
}

export default function Home({ error, ...handlers }: Props): React.JSX.Element {
  const ytcg = useYtcgSession();
  const { session } = ytcg;
  if (session.status === 'ready') {
    return <DeckHome ytcg={ytcg} session={session} error={error} {...handlers} />;
  }
  return (
    <main className="home">
      <Title />
      <SessionNotice session={session} reload={ytcg.reload} handlers={handlers} />
      {error !== null && <p className="error">{error}</p>}
    </main>
  );
}
