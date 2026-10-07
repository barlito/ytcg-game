import type { AuthContext } from '@colyseus/core';
import type { PlayerIdentity } from '../identity.ts';

// Who is joining. Throwing refuses the join.
export interface Authenticator {
  authenticate(context: AuthContext, options: unknown): Promise<PlayerIdentity>;
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
