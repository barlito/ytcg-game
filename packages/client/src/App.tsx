import { Board } from './components/Board.tsx';
import { Home } from './components/Home.tsx';
import { Lobby } from './components/Lobby.tsx';
import { useDuel } from './useDuel.ts';

export function App(): React.JSX.Element {
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
