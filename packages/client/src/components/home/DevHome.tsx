import type { JoinOptions } from '@ytcg-game/server/protocol';
import { useState } from 'react';
import { describeLocation } from '@ytcg-game/engine';
import { catalog, randomDeck } from '../../catalog.ts';
import { DeckCards } from '../decks/DeckCards.tsx';
import { type PlayHandlers, PlayActions } from './PlayActions.tsx';

const NAME_KEY = 'ytcg-game:name';
const NO_LOCATION = '';

function DeckPreview({ deck, onReroll }: { deck: string[]; onReroll: () => void }): React.JSX.Element {
  return (
    <section className="deck">
      <h2 className="eyebrow">Ton deck (aléatoire sans Youl TCG, courbe de coûts respectée)</h2>
      <DeckCards cards={deck} terrain={null} size="large" />
      <button type="button" className="btn-ghost" onClick={onReroll}>
        Nouveau deck
      </button>
    </section>
  );
}

// The location is optional: without one, a random location takes its place.
function LocationPicker({
  location,
  onChange,
}: {
  location: string;
  onChange: (id: string) => void;
}): React.JSX.Element {
  const chosen = location === NO_LOCATION ? null : catalog.location(location);
  return (
    <section className="deck">
      <h2 className="eyebrow">Ton terrain (optionnel, placé sur un des trois lieux)</h2>
      <select
        value={location}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        <option value={NO_LOCATION}>Aucun terrain (aléatoire)</option>
        {[...catalog.locations.values()].map((option) => (
          <option key={option.id} value={option.id}>
            {option.name} ({catalog.extensions.get(option.extension ?? '') ?? 'neutre'})
          </option>
        ))}
      </select>
      <p className="location-help">
        {chosen === null
          ? 'Un terrain aléatoire prendra sa place.'
          : describeLocation(catalog, chosen).join(' ') || 'Aucun effet.'}
      </p>
    </section>
  );
}

function NameField({ name, onChange }: { name: string; onChange: (name: string) => void }): React.JSX.Element {
  return (
    <label className="field">
      Pseudo (dev)
      <input
        value={name}
        maxLength={30}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </label>
  );
}

// Standalone development (no ytcg): a pseudo and a random deck, only accepted by the dev server.
export function DevHome(handlers: PlayHandlers): React.JSX.Element {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [cards, setCards] = useState(randomDeck);
  const [location, setLocation] = useState(NO_LOCATION);
  const options = (): JoinOptions => {
    localStorage.setItem(NAME_KEY, name);
    const trimmed = name.trim();
    const deck = location === NO_LOCATION ? { cards } : { cards, location };
    return trimmed === '' ? { deck } : { name: trimmed, deck };
  };
  return (
    <>
      <NameField name={name} onChange={setName} />
      <DeckPreview
        deck={cards}
        onReroll={() => {
          setCards(randomDeck());
        }}
      />
      <LocationPicker location={location} onChange={setLocation} />
      <PlayActions options={options} {...handlers} />
    </>
  );
}
