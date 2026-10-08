import { type ApiFailure, fetchCollection, fetchDecks } from './api.ts';
import type { Deck, OwnedCard } from './schemas.ts';

export type YtcgSession =
  | { status: 'loading' }
  // No ytcg behind VITE_YTCG_URL (standalone development) or ytcg is down.
  | { status: 'offline'; message: string }
  | { status: 'login'; message: string; loginUrl: string }
  | { status: 'ready'; collection: OwnedCard[]; decks: Deck[]; maxDecks: number };

export function sessionFromFailure(failure: ApiFailure): YtcgSession {
  return failure.kind === 'login'
    ? { status: 'login', message: failure.message, loginUrl: failure.loginUrl }
    : { status: 'offline', message: failure.message };
}

export async function loadSession(): Promise<YtcgSession> {
  const collection = await fetchCollection();
  if (!collection.ok) {
    return sessionFromFailure(collection.failure);
  }
  const decks = await fetchDecks();
  if (!decks.ok) {
    return sessionFromFailure(decks.failure);
  }
  return { status: 'ready', collection: collection.value, decks: decks.value.decks, maxDecks: decks.value.maxDecks };
}
