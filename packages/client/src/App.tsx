import { Suspense, lazy } from 'react';
import { Toast } from './components/ui/Toast.tsx';
import { Lobby } from './components/Lobby.tsx';
import { useDuel } from './useDuel.ts';

// The catalog, the engine and the board load on demand: the first paint only needs React and the SDK.
const Home = lazy(() => import('./components/Home.tsx'));
const Board = lazy(() => import('./components/Board.tsx'));
// Dev only: the constant is false in a production build, so the sandbox and gallery chunks are dropped.
const Sandbox = import.meta.env.DEV ? lazy(() => import('./sandbox/Sandbox.tsx')) : null;
const Gallery = import.meta.env.DEV ? lazy(() => import('./gallery/Gallery.tsx')) : null;

function Loading(): React.JSX.Element {
  return (
    <main className="lobby">
      <p>Chargement…</p>
    </main>
  );
}

function Screen(): React.JSX.Element {
  const duel = useDuel();
  const { phase } = duel;
  switch (phase.kind) {
    case 'home':
      return <Home error={duel.error} onCreate={duel.create} onJoin={duel.join} />;
    case 'connecting':
      return (
        <main className="lobby">
          <p>Connexion…</p>
        </main>
      );
    case 'lobby':
      return <Lobby code={phase.code} onLeave={duel.leave} />;
    case 'game':
      return (
        <>
          <Board game={phase.game} send={duel.send} onLeave={duel.leave} />
          {duel.error !== null && (
            <Toast tone="danger" title="Erreur" floating>
              {duel.error}
            </Toast>
          )}
        </>
      );
  }
}

// ?sandbox (board test page) and ?cards (card gallery), dev only.
function Page(): React.JSX.Element {
  const params = new URLSearchParams(location.search);
  if (Sandbox !== null && params.has('sandbox')) {
    return <Sandbox />;
  }
  if (Gallery !== null && params.has('cards')) {
    return <Gallery />;
  }
  return <Screen />;
}

export function App(): React.JSX.Element {
  return (
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  );
}
