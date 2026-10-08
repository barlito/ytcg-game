import { z } from 'zod';
import {
  type Deck,
  type DeckList,
  type DeckPayload,
  type OwnedCard,
  collectionSchema,
  deckListSchema,
  deckSchema,
  errorSchema,
} from './schemas.ts';

export type ApiFailure =
  | { kind: 'login'; message: string; loginUrl: string }
  | { kind: 'invalid'; message: string; violations: Record<string, string[]> }
  | { kind: 'refused'; message: string }
  | { kind: 'unavailable'; message: string };

export type ApiResult<T> = { ok: true; value: T } | { ok: false; failure: ApiFailure };

export const UNAVAILABLE: ApiFailure = { kind: 'unavailable', message: 'Youl TCG est indisponible, réessaie.' };
const TIMEOUT_MS = 5000;

// VITE_YTCG_URL, else the page origin: in production the game is served on the ytcg domain.
export function ytcgApiUrl(): string {
  const configured: unknown = import.meta.env.VITE_YTCG_URL;
  return typeof configured === 'string' && configured !== '' ? configured.replace(/\/+$/, '') : location.origin;
}

function failureOf(status: number, body: unknown): ApiFailure {
  const error = errorSchema.safeParse(body);
  if (!error.success || status >= 500) {
    return UNAVAILABLE;
  }
  const { error: message, loginUrl, violations } = error.data;
  if (status === 401 && loginUrl !== undefined) {
    return { kind: 'login', message, loginUrl };
  }
  if (status === 422) {
    return { kind: 'invalid', message, violations: violations ?? {} };
  }
  return { kind: 'refused', message };
}

// Pure: what a ytcg answer means for the client.
export function interpretResponse<T>(status: number, body: unknown, schema: z.ZodType<T>): ApiResult<T> {
  if (status >= 200 && status < 300) {
    const parsed = schema.safeParse(body);
    return parsed.success ? { ok: true, value: parsed.data } : { ok: false, failure: UNAVAILABLE };
  }
  return { ok: false, failure: failureOf(status, body) };
}

async function call<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  try {
    const response = await fetch(`${ytcgApiUrl()}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await response.text();
    return interpretResponse(response.status, text === '' ? null : JSON.parse(text), schema);
  } catch {
    // Network error, timeout or a non-JSON page (no ytcg behind this origin).
    return { ok: false, failure: UNAVAILABLE };
  }
}

export async function fetchCollection(): Promise<ApiResult<OwnedCard[]>> {
  const result = await call('/api/duel/collection', collectionSchema);
  return result.ok ? { ok: true, value: result.value.cards } : result;
}

export function fetchDecks(): Promise<ApiResult<DeckList>> {
  return call('/api/duel/decks', deckListSchema);
}

export function saveDeck(id: string | null, payload: DeckPayload): Promise<ApiResult<Deck>> {
  const body = JSON.stringify(payload);
  return id === null
    ? call('/api/duel/decks', deckSchema, { method: 'POST', body })
    : call(`/api/duel/decks/${encodeURIComponent(id)}`, deckSchema, { method: 'PUT', body });
}

export function deleteDeck(id: string): Promise<ApiResult<null>> {
  return call(`/api/duel/decks/${encodeURIComponent(id)}`, z.null(), { method: 'DELETE' });
}
