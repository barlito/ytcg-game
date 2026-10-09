import type { CardDefinition } from '@ytcg-game/engine';
import type { ReactNode } from 'react';
import { CardFan } from './CardFan.tsx';

interface Props {
  fan: readonly CardDefinition[];
  // Name field, play actions…
  children: ReactNode;
}

export function Hero({ fan, children }: Props): React.JSX.Element {
  return (
    <section className="hero">
      <CardFan cards={fan} />
      <div className="hero__text">
        <p className="hero__eyebrow">Youl TCG · Arène</p>
        <h1 className="hero__title">
          Duel<span>.</span>
        </h1>
        <p className="hero__lead">
          Trois lieux, six tours, une révélation à la fois. Prends le contrôle de deux lieux avec les cartes de ta
          collection.
        </p>
        {children}
      </div>
    </section>
  );
}
