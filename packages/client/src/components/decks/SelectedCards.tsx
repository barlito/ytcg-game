import { DECK_SIZE } from '@ytcg-game/engine';
import { catalog } from '../../catalog.ts';

interface Props {
  cards: string[];
  owned: ReadonlySet<string>;
  errors: Record<string, string[]>;
  onRemove: (card: string) => void;
}

interface Line {
  id: string;
  cost: number | null;
  label: string;
  rarity: string;
  problem: string | null;
}

function lineOf(id: string, owned: ReadonlySet<string>): Line {
  const card = catalog.cards.get(id);
  if (card === undefined) {
    return { id, cost: null, label: 'Carte inconnue du duel', rarity: 'common', problem: 'pas encore jouable' };
  }
  const problem = owned.has(id) ? null : 'plus dans ta collection';
  return { id, cost: card.cost, label: `${card.name} · ${card.power}`, rarity: card.rarity, problem };
}

// The deck so far, by cost; a card the player lost or the game does not know stays listed until removed.
export function SelectedCards({ cards, owned, errors, onRemove }: Props): React.JSX.Element {
  const lines = cards.map((id) => lineOf(id, owned)).sort((a, b) => (a.cost ?? 99) - (b.cost ?? 99));
  return (
    <section className="deck">
      <h2 className="eyebrow">
        Cartes ({cards.length}/{DECK_SIZE})
      </h2>
      <ul className="selected-cards">
        {lines.map((line) => (
          <li key={line.id} data-rarity={line.rarity} className={line.problem === null ? '' : 'is-problem'}>
            <span>
              {line.cost ?? '?'} · {line.label}
              {line.problem !== null && <em> ({line.problem})</em>}
              {errors[line.id] !== undefined && <span className="error is-small"> {errors[line.id]?.join(' ')}</span>}
            </span>
            <button
              type="button"
              className="remove"
              aria-label={`Retirer ${line.label}`}
              onClick={() => {
                onRemove(line.id);
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
