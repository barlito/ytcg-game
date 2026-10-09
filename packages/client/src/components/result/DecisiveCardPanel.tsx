import { catalog } from '../../catalog.ts';
import type { DecisiveCard } from '../../lib/endgame.ts';
import { useMediaQuery } from '../../lib/useMediaQuery.ts';
import { placeName } from '../../animation/spotlight.ts';
import type { PlayerView } from '@ytcg-game/engine';
import { CardFace } from '../card/CardFace.tsx';

// The strongest card of the winner on a location the winner took (rule in lib/endgame.ts).
export function DecisiveCardPanel({ decisive, view }: { decisive: DecisiveCard; view: PlayerView }): React.JSX.Element {
  const narrow = useMediaQuery('(max-width: 900px)');
  const { card, location } = decisive;
  return (
    <section className="result-decisive" aria-label="Carte décisive">
      <p className="result-decisive__label">Carte décisive</p>
      <div className="result-decisive__card">
        <CardFace card={card} size={narrow ? 'compact' : 'full'} />
      </div>
      <p className="result-decisive__caption">
        <strong>{catalog.card(card.defId).name}</strong>, {card.power} de puissance sur{' '}
        <strong>{placeName(view, location)}</strong>
      </p>
    </section>
  );
}
