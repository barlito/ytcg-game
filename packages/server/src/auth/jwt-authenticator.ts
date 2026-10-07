import type { AuthContext } from '@colyseus/core';
import { type CryptoKey, importSPKI, jwtVerify } from 'jose';
import { z } from 'zod';
import type { PlayerIdentity } from '../identity.ts';
import { AuthenticationError, type Authenticator } from './authenticator.ts';

const COOKIE_NAME = 'jwt';

const claimsSchema = z.object({
  discordId: z.string().min(1),
  username: z.string().min(1),
});

// The ytcg session: its `jwt` cookie (same domain), verified with the ytcg public key.
export class JwtAuthenticator implements Authenticator {
  private readonly key: CryptoKey;
  private readonly algorithm: string;

  private constructor(key: CryptoKey, algorithm: string) {
    this.key = key;
    this.algorithm = algorithm;
  }

  static async fromPublicKey(pem: string, algorithm: string): Promise<JwtAuthenticator> {
    return new JwtAuthenticator(await importSPKI(pem, algorithm), algorithm);
  }

  async authenticate(context: AuthContext): Promise<PlayerIdentity> {
    const token = context.token ?? readCookie(context.headers.get('cookie'), COOKIE_NAME);
    if (token === null) {
      throw new AuthenticationError('missing ytcg session');
    }
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: [this.algorithm] });
      const claims = claimsSchema.parse(payload);
      return { id: claims.discordId, name: claims.username };
    } catch {
      throw new AuthenticationError('invalid ytcg session');
    }
  }
}

export function readCookie(header: string | null, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name && value.length > 0) {
      return decodeURIComponent(value.join('='));
    }
  }
  return null;
}
