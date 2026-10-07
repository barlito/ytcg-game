import { joinOptionsSchema } from '../protocol.ts';
import type { PlayerIdentity } from '../identity.ts';
import { AuthenticationError, type Authenticator } from './authenticator.ts';

// Development only (wired by src/dev.ts, never by src/main.ts): the player picks a name, no ytcg session needed.
export class DevAuthenticator implements Authenticator {
  authenticate(_context: unknown, options: unknown): Promise<PlayerIdentity> {
    const name = joinOptionsSchema.safeParse(options).data?.name;
    if (name === undefined) {
      return Promise.reject(new AuthenticationError('a name is required in development'));
    }
    return Promise.resolve({ id: `dev:${name.toLowerCase()}`, name });
  }
}
