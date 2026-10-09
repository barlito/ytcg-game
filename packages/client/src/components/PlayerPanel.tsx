import type { PlayerView } from '@ytcg-game/engine';
import { Avatar } from './ui/Avatar.tsx';

// Bottom left: your avatar, your deck, your energy as mana gems (spent ones are hollow).
export function PlayerPanel({ view }: { view: PlayerView }): React.JSX.Element {
  const left = view.energy - view.spent;
  return (
    <section className="player-panel" aria-label="Toi">
      <div className="player-panel__who">
        <Avatar name="Toi" tone="you" />
        <div className="status-opponent__text">
          <span className="status-name">Toi</span>
          <span className="status-counts">{view.deckCount} au deck</span>
        </div>
      </div>
      <div className="player-panel__energy">
        <span className="energy-label">
          Énergie{' '}
          <strong>
            {left} / {view.energy}
          </strong>
        </span>
        <span className="energy-gems" role="img" aria-label={`${String(left)} énergie sur ${String(view.energy)}`}>
          {Array.from({ length: view.energy }, (_, index) => (
            <span key={index} className={index < left ? 'gem' : 'gem is-spent'} />
          ))}
        </span>
      </div>
    </section>
  );
}
