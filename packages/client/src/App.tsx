import { Suspense, lazy } from 'react';
import { Lobby } from './components/Lobby.tsx';
import { useDuel } from './useDuel.ts';

// The catalog, the engine and the board load on demand: the first paint only needs React and the SDK.
const Home = lazy(() => import('./components/Home.tsx'));
const Board = lazy(() => import('./components/Board.tsx'));

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
          {duel.error !== null && <p className="toast">{duel.error}</p>}
        </>
      );
  }
}

export function App(): React.JSX.Element {
  return (
    <Suspense fallback={<Loading />}>
      <Screen />
    </Suspense>
  );
}
