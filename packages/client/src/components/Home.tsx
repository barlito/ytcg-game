import type { JoinOptions } from '@ytcg-game/server/protocol';
import { useState } from 'react';
import { describeLocation } from '@ytcg-game/engine';
import { catalog, randomDeck } from '../catalog.ts';

interface Props {
  error: string | null;
  onCreate: (options: JoinOptions) => void;
  onJoin: (code: string, options: JoinOptions) => void;
}

const NAME_KEY = 'ytcg-game:name';

function DeckPreview({ deck, onReroll }: { deck: string[]; onReroll: () => void }): React.JSX.Element {
  return (
    <section className="deck">
      <h2 className="eyebrow">Ton deck (aléatoire en attendant les decks ytcg, courbe de coûts respectée)</h2>
      <ul>
        {[...deck]
          .sort((a, b) => catalog.card(a).cost - catalog.card(b).cost)
          .map((id) => {
            const card = catalog.card(id);
            return (
              <li key={id} data-rarity={card.rarity}>
                {card.cost} · {card.name} · {card.power}
              </li>
            );
          })}
      </ul>
      <button type="button" className="btn-ghost" onClick={onReroll}>
        Nouveau deck
      </button>
    </section>
  );
}

function JoinForm({ onJoin }: { onJoin: (code: string) => void }): React.JSX.Element {
  const [code, setCode] = useState('');
  return (
    <div className="join">
      <input
        placeholder="Code de la partie"
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
        }}
      />
      <button
        type="button"
        className="btn-arcade"
        disabled={code.trim() === ''}
        onClick={() => {
          onJoin(code);
        }}
      >
        Rejoindre
      </button>
    </div>
  );
}

const NO_LOCATION = '';

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
            {option.name}
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

export function Home({ error, onCreate, onJoin }: Props): React.JSX.Element {
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
    <main className="home">
      <h1 className="title">
        Youl TCG <span>Duel</span>
      </h1>
      <NameField name={name} onChange={setName} />
      <DeckPreview
        deck={cards}
        onReroll={() => {
          setCards(randomDeck());
        }}
      />
      <LocationPicker location={location} onChange={setLocation} />
      <div className="home-actions">
        <button
          type="button"
          className="btn-arcade"
          onClick={() => {
            onCreate(options());
          }}
        >
          Créer une partie
        </button>
        <JoinForm
          onJoin={(code) => {
            onJoin(code, options());
          }}
        />
      </div>
      {error !== null && <p className="error">{error}</p>}
    </main>
  );
}
