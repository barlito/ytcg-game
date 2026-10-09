import type { CardDefinition } from '@ytcg-game/engine';
import { useMediaQuery } from '../../lib/useMediaQuery.ts';
import { DefinitionFace } from '../decks/PoolTile.tsx';

// Three real cards floating in a fan (the float stops in reduced motion, see home.css).
export function CardFan({ cards }: { cards: readonly CardDefinition[] }): React.JSX.Element | null {
  const narrow = useMediaQuery('(max-width: 860px)');
  if (cards.length < 3) {
    return null;
  }
  return (
    <div className="fan" aria-hidden="true">
      {cards.slice(0, 3).map((definition, index) => (
        <div key={definition.id} className={`fan__card is-${['left', 'centre', 'right'][index] ?? 'centre'}`}>
          <DefinitionFace definition={definition} size={narrow ? 'compact' : 'full'} />
        </div>
      ))}
    </div>
  );
}
