import { catalog } from '../catalog.ts';
import { pickFan } from '../decks/showcase.ts';
import type { YtcgSession } from '../ytcg/session.ts';
import { useYtcgSession } from '../ytcg/useYtcgSession.ts';
import { Toast } from './ui/Toast.tsx';
import { DeckHome } from './decks/DeckHome.tsx';
import { DevHome } from './home/DevHome.tsx';
import { Hero } from './home/Hero.tsx';
import { HomeShell } from './home/HomeShell.tsx';
import { LoginPrompt, Unavailable } from './home/Notices.tsx';
import type { PlayHandlers } from './home/PlayActions.tsx';

interface Props extends PlayHandlers {
  error: string | null;
}

interface NoticeProps {
  session: Exclude<YtcgSession, { status: 'ready' }>;
  reload: () => void;
}

const CATALOG_FAN = pickFan([...catalog.cards.values()], []);
const stay = (): void => undefined;

function SessionNotice({ session, reload }: NoticeProps): React.JSX.Element {
  switch (session.status) {
    case 'loading':
      return <p className="hero__lead">Connexion à Youl TCG…</p>;
    case 'login':
      return <LoginPrompt message={session.message} loginUrl={session.loginUrl} onRetry={reload} />;
    case 'offline':
      return <Unavailable message={session.message} onRetry={reload} />;
  }
}

export default function Home({ error, ...handlers }: Props): React.JSX.Element {
  const ytcg = useYtcgSession();
  const { session } = ytcg;
  if (session.status === 'ready') {
    return <DeckHome ytcg={ytcg} session={session} error={error} {...handlers} />;
  }
  // Standalone development keeps the random deck; in production the server only accepts ytcg decks.
  if (session.status === 'offline' && import.meta.env.DEV) {
    return <DevHome error={error} {...handlers} />;
  }
  return (
    <HomeShell active="arena" onArena={stay}>
      <main className="home">
        <Hero fan={CATALOG_FAN}>
          <SessionNotice session={session} reload={ytcg.reload} />
        </Hero>
        {error !== null && <Toast tone="danger">{error}</Toast>}
      </main>
    </HomeShell>
  );
}
