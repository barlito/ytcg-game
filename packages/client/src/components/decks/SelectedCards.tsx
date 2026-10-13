import type { CopyKind } from '../../decks/copies.ts';
import { catalog } from '../../catalog.ts';
import { Artwork } from '../Artwork.tsx';

interface Props {
  cards: string[];
  owned: ReadonlySet<string>;
  // The toggle is offered for cards owned in both kinds only; holo-only cards show a fixed holo mark.
  kinds: ReadonlyMap<string, CopyKind>;
  holo: readonly string[];
  errors: Record<string, string[]>;
  onRemove: (card: string) => void;
  onHolo: (card: string) => void;
}

interface Line {
  id: string;
  cost: number | null;
  name: string;
  image: string | null;
  problem: string | null;
}

function lineOf(id: string, owned: ReadonlySet<string>): Line {
  const card = catalog.cards.get(id);
  if (card === undefined) {
    return { id, cost: null, name: 'Carte inconnue du duel', image: null, problem: 'pas encore jouable' };
  }
  const problem = owned.has(id) ? null : 'plus dans ta collection';
  return { id, cost: card.cost, name: card.name, image: card.image, problem };
}

interface LineProps {
  line: Line;
  error: string[] | undefined;
  kind: CopyKind;
  holo: boolean;
  onRemove: () => void;
  onHolo: () => void;
}

function CardLine({ line, error, kind, holo, onRemove, onHolo }: LineProps): React.JSX.Element {
  return (
    <li className={`deck-line${line.problem === null && error === undefined ? '' : ' is-problem'}`}>
      <Artwork image={line.image} className="deck-line__art" />
      <span className="mana-gem">{line.cost ?? '?'}</span>
      <span className="deck-line__name">
        {line.name}
        {line.problem !== null && <em> ({line.problem})</em>}
        {error !== undefined && <small className="error is-small"> {error.join(' ')}</small>}
      </span>
      {kind === 'holo' && (
        <span className="deck-line__holo is-on is-forced" title="Tu ne possèdes que des exemplaires holo">
          holo
        </span>
      )}
      {kind === 'both' && (
        <button
          type="button"
          className={`deck-line__holo${holo ? ' is-on' : ''}`}
          aria-pressed={holo}
          aria-label={`Jouer ${line.name} en holo`}
          title={holo ? 'Exemplaire holo joué' : 'Jouer ton exemplaire holo'}
          onClick={onHolo}
        >
          holo
        </button>
      )}
      <button type="button" className="deck-line__remove" aria-label={`Retirer ${line.name}`} onClick={onRemove}>
        −
      </button>
    </li>
  );
}

// The deck so far, by cost; a card the player lost or the game does not know stays listed until removed.
export function SelectedCards({ cards, owned, kinds, holo, errors, onRemove, onHolo }: Props): React.JSX.Element {
  const lines = cards.map((id) => lineOf(id, owned)).sort((a, b) => (a.cost ?? 99) - (b.cost ?? 99));
  return (
    <ul className="deck-lines" aria-label="Cartes du deck">
      {lines.length === 0 && <li className="deck-lines__empty">Clique une carte de ta collection pour l’ajouter.</li>}
      {lines.map((line) => (
        <CardLine
          key={line.id}
          line={line}
          error={errors[line.id]}
          kind={kinds.get(line.id) ?? 'none'}
          holo={holo.includes(line.id)}
          onRemove={() => {
            onRemove(line.id);
          }}
          onHolo={() => {
            onHolo(line.id);
          }}
        />
      ))}
    </ul>
  );
}
