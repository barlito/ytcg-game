import { DECK_SIZE } from '@ytcg-game/engine';
import { describe, expect, it } from 'vitest';
import { readConfig, readProductionConfig } from '../src/config.ts';
import { CatalogDeckProvider } from '../src/decks/catalog-deck-provider.ts';
import { DeckError } from '../src/decks/deck-provider.ts';
import { YTCG_UNAVAILABLE } from '../src/decks/ytcg-deck-api.ts';
import { YtcgDeckProvider } from '../src/decks/ytcg-deck-provider.ts';
import { ALICE, catalog, randomDeck } from './support.ts';

const DISCORD = { id: '123456789012345678', name: 'Alice' };
const [terrain = ''] = catalog.locations.keys();

interface Call {
  url: string;
  init: RequestInit | undefined;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function ytcg(answer: (call: Call) => Response | Promise<Response>): { provider: YtcgDeckProvider; calls: Call[] } {
  const calls: Call[] = [];
  const fetchMock = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const call = { url, init };
    calls.push(call);
    return Promise.resolve(answer(call));
  };
  const provider = new YtcgDeckProvider(catalog, {
    baseUrl: 'http://ytcg.test/',
    token: 'secret',
    fetch: fetchMock, // the mock only implements the (url, init) form the provider uses
    timeoutMs: 30,
  });
  return { provider, calls };
}

function serverDeck(cards: string[], terrainId: string | null): Record<string, unknown> {
  return { id: 'deck-1', name: 'Linettes', cards, terrain: terrainId };
}

describe('ytcg decks', () => {
  const { cards } = randomDeck(4);

  it('asks ytcg for the deck of the authenticated player, with the server token', async () => {
    const { provider, calls } = ytcg(() => json(200, serverDeck(cards, terrain)));
    await expect(provider.deckFor(DISCORD, { deckId: 'deck-1' })).resolves.toEqual({ cards, location: terrain });
    expect(calls[0]?.url).toBe('http://ytcg.test/api/duel/server/decks/deck-1?player=123456789012345678');
    expect(new Headers(calls[0]?.init?.headers).get('Authorization')).toBe('Bearer secret');
  });

  it('maps a deck without terrain to a choice without location', async () => {
    const { provider } = ytcg(() => json(200, serverDeck(cards, null)));
    await expect(provider.deckFor(DISCORD, { deckId: 'deck-1' })).resolves.toEqual({ cards });
  });

  it('never accepts an inline deck', async () => {
    const { provider, calls } = ytcg(() => json(200, serverDeck(cards, null)));
    await expect(provider.deckFor(DISCORD, { deck: { cards } })).rejects.toThrow('Choisis un de tes decks');
    await expect(provider.deckFor(DISCORD, { deckId: 'deck-1', deck: { cards } })).rejects.toThrow(DeckError);
    await expect(provider.deckFor(DISCORD, { deckId: '../admin' })).rejects.toThrow(DeckError);
    expect(calls).toEqual([]);
  });

  it('tells how many cards an incomplete deck misses', async () => {
    const body = { error: 'Deck incomplet', missingCards: ['a', 'b'], issues: [] };
    const { provider } = ytcg(() => json(409, body));
    await expect(provider.deckFor(DISCORD, { deckId: 'deck-1' })).rejects.toThrow('2 cartes manquent');
  });

  it('refuses an unknown deck', async () => {
    const { provider } = ytcg(() => json(404, { error: 'Deck introuvable pour ce joueur.' }));
    await expect(provider.deckFor(DISCORD, { deckId: 'deck-1' })).rejects.toThrow('Deck introuvable');
  });

  it('turns a server-side failure into « unavailable »', async () => {
    for (const answer of [json(401, { error: 'Jeton' }), json(500, {}), new Response('<html>', { status: 200 })]) {
      const { provider } = ytcg(() => answer);
      await expect(provider.deckFor(DISCORD, { deckId: 'deck-1' })).rejects.toThrow(YTCG_UNAVAILABLE);
    }
  });

  it('gives up after the timeout', async () => {
    const { provider } = ytcg(
      ({ init }) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('timeout', 'TimeoutError'));
          });
        }),
    );
    await expect(provider.deckFor(DISCORD, { deckId: 'deck-1' })).rejects.toThrow(YTCG_UNAVAILABLE);
  });

  it('applies the game rules ytcg does not check', async () => {
    const unknown = ytcg(() => json(200, serverDeck([...cards.slice(1), 'not-in-the-game'], null)));
    await expect(unknown.provider.deckFor(DISCORD, { deckId: 'd' })).rejects.toThrow('pas encore jouable');
    const noTerrain = ytcg(() => json(200, serverDeck(cards, 'not-a-terrain')));
    await expect(noTerrain.provider.deckFor(DISCORD, { deckId: 'd' })).rejects.toThrow('terrain');
    const expensive = [...catalog.cards.values()].filter((card) => card.cost >= 5).map((card) => card.id);
    const curve = ytcg(() => json(200, serverDeck(expensive.slice(0, DECK_SIZE), null)));
    await expect(curve.provider.deckFor(DISCORD, { deckId: 'd' })).rejects.toThrow('Courbe de coûts à revoir');
  });
});

describe('catalog decks (development)', () => {
  it('accepts a legal inline deck and refuses the rest', async () => {
    const decks = new CatalogDeckProvider(catalog);
    const deck = randomDeck(9);
    await expect(decks.deckFor(ALICE, { deck })).resolves.toEqual(deck);
    const short = { deck: { ...deck, cards: deck.cards.slice(0, 11) } };
    await expect(decks.deckFor(ALICE, short)).rejects.toThrow(`exactement ${DECK_SIZE} cartes`);
    await expect(decks.deckFor(ALICE, { deck: { ...deck, location: 'nowhere' } })).rejects.toThrow(DeckError);
    await expect(decks.deckFor(ALICE, { deck: { cards: deck.cards } })).resolves.toEqual({ cards: deck.cards });
    await expect(decks.deckFor(ALICE, { deckId: 'deck-1' })).rejects.toThrow('Un deck est requis.');
  });
});

describe('configuration', () => {
  const production = {
    YTCG_JWT_PUBLIC_KEY_PATH: '/keys/public.pem',
    YTCG_API_URL: 'http://ytcg_php',
    DUEL_SERVER_TOKEN: 'secret',
  };

  it('requires the ytcg session and deck settings in production only', () => {
    expect(readConfig({}).YTCG_API_URL).toBeUndefined();
    expect(readProductionConfig(production).DUEL_SERVER_TOKEN).toBe('secret');
    expect(() => readProductionConfig({ YTCG_JWT_PUBLIC_KEY_PATH: '/k' })).toThrow(
      'missing environment variables: YTCG_API_URL, DUEL_SERVER_TOKEN',
    );
    expect(() => readProductionConfig({ ...production, YTCG_API_URL: 'ftp://ytcg' })).toThrow();
  });
});
