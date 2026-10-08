import { type CardDefinition, describeCard } from '@ytcg-game/engine';
import type { ReactNode } from 'react';
import { catalog } from '../../catalog.ts';

// Tooltip body of a card known only by its definition (deck screens): name, cost, power, full effect.
export function DefinitionTip({
  definition,
  children,
}: {
  definition: CardDefinition;
  children?: ReactNode;
}): React.JSX.Element {
  const text = describeCard(catalog, definition);
  return (
    <div className="tip-card" data-rarity={definition.rarity}>
      <p className="tip-title">
        {definition.name}
        <span>
          Coût {definition.cost} · Puissance {definition.power}
        </span>
      </p>
      <p className={`tip-text${text.length === 0 ? ' is-empty' : ''}`}>
        {text.length === 0 ? 'Aucun effet.' : text.join(' ')}
      </p>
      {children}
    </div>
  );
}
