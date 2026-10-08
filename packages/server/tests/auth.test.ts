import type { AuthContext } from '@colyseus/core';
import { SignJWT, exportSPKI, generateKeyPair } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { AuthenticationError } from '../src/auth/authenticator.ts';
import { DevAuthenticator } from '../src/auth/dev-authenticator.ts';
import { JwtAuthenticator, readCookie } from '../src/auth/jwt-authenticator.ts';
import { ALICE, randomDeck } from './support.ts';

function contextWithCookie(cookie: string | null): AuthContext {
  const headers = new Headers();
  if (cookie !== null) {
    headers.set('cookie', cookie);
  }
  return { headers, ip: '127.0.0.1' };
}

describe('ytcg session authentication', () => {
  let sign: (claims: Record<string, unknown>) => Promise<string>;
  let authenticator: JwtAuthenticator;

  beforeAll(async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    authenticator = await JwtAuthenticator.fromPublicKey(await exportSPKI(publicKey), 'RS256');
    sign = (claims) =>
      new SignJWT(claims).setProtectedHeader({ alg: 'RS256' }).setExpirationTime('5m').sign(privateKey);
  });

  it('reads the player from the jwt cookie', async () => {
    const token = await sign({ discordId: '123', username: 'Barlito', roles: [] });
    const context = contextWithCookie(`theme=dark; jwt=${token}; other=1`);
    await expect(authenticator.authenticate(context)).resolves.toEqual({ id: '123', name: 'Barlito' });
  });

  it('refuses a missing, forged, expired or incomplete token', async () => {
    const other = await generateKeyPair('RS256');
    const forged = await new SignJWT({ discordId: '1', username: 'x' })
      .setProtectedHeader({ alg: 'RS256' })
      .sign(other.privateKey);
    const expired = await new SignJWT({ discordId: '1', username: 'x' })
      .setProtectedHeader({ alg: 'RS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign((await generateKeyPair('RS256')).privateKey);
    for (const cookie of [null, `jwt=${forged}`, `jwt=${expired}`, `jwt=${await sign({ username: 'x' })}`]) {
      await expect(authenticator.authenticate(contextWithCookie(cookie))).rejects.toThrow(AuthenticationError);
    }
  });

  it('parses cookie headers', () => {
    expect(readCookie('a=1; jwt=abc=def', 'jwt')).toBe('abc=def');
    expect(readCookie('a=1', 'jwt')).toBeNull();
    expect(readCookie(null, 'jwt')).toBeNull();
  });
});

describe('development authentication', () => {
  it('takes the name from the join options', async () => {
    const dev = new DevAuthenticator();
    const deck = randomDeck(1);
    await expect(dev.authenticate({}, { name: 'Alice', deck })).resolves.toEqual(ALICE);
    await expect(dev.authenticate({}, { deck })).rejects.toThrow(AuthenticationError);
  });
});
