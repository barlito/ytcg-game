import { z } from 'zod';
import { DeckError } from './deck-provider.ts';

export interface YtcgApiOptions {
  // ytcg origin as seen from the game server, e.g. http://ytcg_php (shared Traefik network).
  baseUrl: string;
  // DUEL_SERVER_TOKEN, shared with ytcg.
  token: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

const serverDeckSchema = z.object({
  id: z.string(),
  name: z.string(),
  cards: z.array(z.string().min(1)),
  terrain: z.string().min(1).nullable(),
});

export type ServerDeck = z.output<typeof serverDeckSchema>;

const incompleteSchema = z.object({ missingCards: z.array(z.string()).default([]) });

export const YTCG_UNAVAILABLE = 'Youl TCG est indisponible, réessaie.';
const DEFAULT_TIMEOUT_MS = 3000;

// GET /api/duel/server/decks/{id}?player=<discordId>: the deck as it must be played, checked against ownership now.
export class YtcgDeckApi {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetch: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: YtcgApiOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.fetch = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async deck(deckId: string, playerId: string): Promise<ServerDeck> {
    const url = `${this.baseUrl}/api/duel/server/decks/${encodeURIComponent(deckId)}?player=${encodeURIComponent(playerId)}`;
    let response: Response;
    let body: unknown;
    try {
      response = await this.fetch(url, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      body = await response.json();
    } catch {
      throw new DeckError(YTCG_UNAVAILABLE);
    }
    return readDeck(response.status, body);
  }
}

function readDeck(status: number, body: unknown): ServerDeck {
  if (status === 200) {
    const deck = serverDeckSchema.safeParse(body);
    if (deck.success) {
      return deck.data;
    }
  }
  if (status === 409) {
    throw new DeckError(incompleteMessage(incompleteSchema.safeParse(body).data?.missingCards.length ?? 0));
  }
  if (status === 404) {
    throw new DeckError('Deck introuvable : choisis un de tes decks Youl TCG.');
  }
  // 400, 401 (token mismatch), 5xx or an unreadable 200: a server-side problem, not the player's.
  console.error(`ytcg deck API answered ${status}`);
  throw new DeckError(YTCG_UNAVAILABLE);
}

function incompleteMessage(missing: number): string {
  if (missing === 0) {
    return 'Deck incomplet : il ne correspond plus à ta collection Youl TCG.';
  }
  const cards = missing === 1 ? '1 carte manque' : `${missing} cartes manquent`;
  return `Deck incomplet : ${cards} dans ta collection Youl TCG (vendue, échangée ou recyclée). Modifie-le avant de jouer.`;
}
