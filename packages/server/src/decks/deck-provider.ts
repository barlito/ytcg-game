import type { PlayerIdentity } from '../identity.ts';
import type { DeckChoice } from '../protocol.ts';

// Where a player's deck comes from. Throwing refuses the join.
export interface DeckProvider {
  deckFor(player: PlayerIdentity, options: unknown): Promise<DeckChoice>;
}

// Its message is shown to the player as is (French).
export class DeckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeckError';
  }
}
