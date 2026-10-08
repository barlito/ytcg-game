import { useCallback, useEffect, useState } from 'react';
import { type YtcgSession, loadSession } from './session.ts';
import type { Deck } from './schemas.ts';

export interface YtcgSessionHandle {
  session: YtcgSession;
  reload: () => void;
  // Applies a change to the deck list of a ready session (after a save or a delete).
  updateDecks: (update: (decks: Deck[]) => Deck[]) => void;
}

export function useYtcgSession(): YtcgSessionHandle {
  const [session, setSession] = useState<YtcgSession>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    void loadSession().then((loaded) => {
      if (current) {
        setSession(loaded);
      }
    });
    return () => {
      current = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setSession({ status: 'loading' });
    setAttempt((count) => count + 1);
  }, []);

  const updateDecks = useCallback((update: (decks: Deck[]) => Deck[]) => {
    setSession((current) => (current.status === 'ready' ? { ...current, decks: update(current.decks) } : current));
  }, []);

  return { session, reload, updateDecks };
}
