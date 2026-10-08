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

function place(errors: DraftErrors, key: string, messages: string[], sentCards: readonly string[]): void {
  const index = CARD_INDEX.exec(key)?.[1];
  const card = index === undefined ? undefined : sentCards[Number(index)];
  if (card !== undefined) {
    errors.byCard[card] = [...(errors.byCard[card] ?? []), ...messages];
  } else if (key === 'name' || key === 'terrain' || key === 'cards') {
    errors[key].push(...messages);
  } else {
    errors.cards.push(...messages);
  }
}

export function mapViolations(violations: Record<string, string[]>, sentCards: readonly string[]): DraftErrors {
  const errors: DraftErrors = { ...NO_ERRORS, name: [], cards: [], byCard: {}, terrain: [], general: [] };
  for (const [key, messages] of Object.entries(violations)) {
    place(errors, key, messages, sentCards);
  }
  return errors;
}

export function errorsFromFailure(failure: ApiFailure, sentCards: readonly string[]): DraftErrors {
  switch (failure.kind) {
    case 'invalid': {
      const errors = mapViolations(failure.violations, sentCards);
      return { ...errors, general: [failure.message] };
    }
    case 'login':
      return { ...NO_ERRORS, general: [failure.message], loginUrl: failure.loginUrl };
    case 'refused':
    case 'unavailable':
      return { ...NO_ERRORS, general: [failure.message] };
  }
}
