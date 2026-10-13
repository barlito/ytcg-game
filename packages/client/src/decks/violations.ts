import type { ApiFailure } from '../ytcg/api.ts';

export interface DraftErrors {
  name: string[];
  cards: string[];
  // Keyed by card id (ytcg reports `cards[i]`, an index in the list sent).
  byCard: Record<string, string[]>;
  terrain: string[];
  general: string[];
  loginUrl: string | null;
}

export const NO_ERRORS: DraftErrors = { name: [], cards: [], byCard: {}, terrain: [], general: [], loginUrl: null };

const CARD_INDEX = /^cards\[(\d+)\]$/;
const HOLO_INDEX = /^holoCards\[(\d+)\]$/;

// What was sent: ytcg reports `cards[i]` / `holoCards[i]`, indexes in these lists.
export interface SentLists {
  cards: readonly string[];
  holoCards: readonly string[];
}

function cardOf(key: string, sent: SentLists): string | undefined {
  const holoIndex = HOLO_INDEX.exec(key)?.[1];
  if (holoIndex !== undefined) {
    return sent.holoCards[Number(holoIndex)];
  }
  const index = CARD_INDEX.exec(key)?.[1];
  return index === undefined ? undefined : sent.cards[Number(index)];
}

function place(errors: DraftErrors, key: string, messages: string[], sent: SentLists): void {
  const card = cardOf(key, sent);
  if (card !== undefined) {
    errors.byCard[card] = [...(errors.byCard[card] ?? []), ...messages];
  } else if (key === 'name' || key === 'terrain' || key === 'cards') {
    errors[key].push(...messages);
  } else {
    errors.cards.push(...messages);
  }
}

export function mapViolations(violations: Record<string, string[]>, sent: SentLists): DraftErrors {
  const errors: DraftErrors = { ...NO_ERRORS, name: [], cards: [], byCard: {}, terrain: [], general: [] };
  for (const [key, messages] of Object.entries(violations)) {
    place(errors, key, messages, sent);
  }
  return errors;
}

export function errorsFromFailure(failure: ApiFailure, sent: SentLists): DraftErrors {
  switch (failure.kind) {
    case 'invalid': {
      const errors = mapViolations(failure.violations, sent);
      return { ...errors, general: [failure.message] };
    }
    case 'login':
      return { ...NO_ERRORS, general: [failure.message], loginUrl: failure.loginUrl };
    case 'refused':
    case 'unavailable':
      return { ...NO_ERRORS, general: [failure.message] };
  }
}
