import { type CardView, describeCard } from '@ytcg-game/engine';
import { catalog } from '../../catalog.ts';
import { powerLines, signedAmount, statusLines } from '../../power.ts';

function Breakdown({ card }: { card: CardView }): React.JSX.Element {
  return (
    <dl className="tip-breakdown">
      {powerLines(card).map((line, index) => (
        <div key={line.label} className={line.amount < 0 ? 'is-down' : index > 0 ? 'is-up' : ''}>
          <dt>{line.label}</dt>
          <dd>{index === 0 ? line.amount : signedAmount(line.amount)}</dd>
        </div>
      ))}
      <div className="is-total">
        <dt>Puissance</dt>
        <dd>{card.power}</dd>
      </div>
    </dl>
  );
}

function Statuses({ card }: { card: CardView }): React.JSX.Element | null {
  const lines = statusLines(card);
  if (lines.length === 0) {
    return null;
  }
  return (
    <ul className="tip-statuses">
      {lines.map((line) => (
        <li key={line.id}>
          <strong className={`status-${line.id}`}>
            {line.name}
            {line.stacks > 1 ? ` ×${line.stacks}` : ''}
          </strong>{' '}
          {line.rule}
        </li>
      ))}
    </ul>
  );
}

// Tooltip content: full effect text, power breakdown, statuses with their rule.
export function CardDetails({ card }: { card: CardView }): React.JSX.Element {
  const definition = catalog.card(card.defId);
  const text = describeCard(catalog, definition);
  return (
    <div className="tip-card" data-rarity={definition.rarity}>
      <p className="tip-title">
        {definition.name}
        <span>
          Coût {card.cost} · Puissance {card.power}
        </span>
      </p>
      {text.length === 0 ? (
        <p className="tip-text is-empty">Aucun effet.</p>
      ) : (
        text.map((line) => (
          <p key={line} className="tip-text">
            {line}
          </p>
        ))
      )}
      {(card.breakdown.modifier !== 0 || card.breakdown.ongoing.length > 0) && <Breakdown card={card} />}
      <Statuses card={card} />
    </div>
  );
}
