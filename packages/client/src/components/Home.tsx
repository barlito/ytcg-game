import type { JoinOptions } from '@ytcg-game/server/protocol';
import { useState } from 'react';
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
      <h2 className="eyebrow">Ton deck (aléatoire en attendant les decks ytcg)</h2>
      <ul>
        {deck.map((id) => {
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

export function Home({ error, onCreate, onJoin }: Props): React.JSX.Element {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [deck, setDeck] = useState(randomDeck);
  const options = (): JoinOptions => {
    localStorage.setItem(NAME_KEY, name);
    const trimmed = name.trim();
    return trimmed === '' ? { deck } : { name: trimmed, deck };
  };

  return (
    <main className="home">
      <h1 className="title">
        Youl TCG <span>Duel</span>
      </h1>
      <label className="field">
        Pseudo (dev)
        <input
          value={name}
          maxLength={30}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </label>
      <DeckPreview
        deck={deck}
        onReroll={() => {
          setDeck(randomDeck());
        }}
      />
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
