import { describe, expect, it } from '@jest/globals';
import { NoActiveAuthClientError } from './errors';
import { EXPIRY_SKEW_MS, TokenCache } from './token-cache';
import type { PartnerToken } from './types';
import { fakeClock } from './test-support';

function fakeMint(clock: ReturnType<typeof fakeClock>, expiresInSeconds = 3600) {
  let mints = 0;
  const mint = async (): Promise<PartnerToken> => {
    mints += 1;
    await Promise.resolve();
    return { accessToken: `tok-${mints}`, expiresAt: new Date(clock.now().getTime() + expiresInSeconds * 1000) };
  };
  return { mint, mints: () => mints };
}

describe('TokenCache', () => {
  it('serves the cached token on a second call without minting again', async () => {
    const clock = fakeClock('2026-05-01T12:00:00.000Z');
    const cache = new TokenCache(clock.now);
    const fake = fakeMint(clock);

    const first = await cache.getOrMint('sandbox:p1', fake.mint);
    const second = await cache.getOrMint('sandbox:p1', fake.mint);

    expect(first.accessToken).toBe('tok-1');
    expect(second.accessToken).toBe('tok-1');
    expect(fake.mints()).toBe(1);
  });

  it('keys by environment and partner, so another key mints its own token', async () => {
    const clock = fakeClock('2026-05-01T12:00:00.000Z');
    const cache = new TokenCache(clock.now);
    const fake = fakeMint(clock);

    await cache.getOrMint('sandbox:p1', fake.mint);
    await cache.getOrMint('sandbox:p2', fake.mint);
    await cache.getOrMint('production:p1', fake.mint);

    expect(fake.mints()).toBe(3);
  });

  it('mints again once the token is inside the 60 second expiry margin', async () => {
    const clock = fakeClock('2026-05-01T12:00:00.000Z');
    const cache = new TokenCache(clock.now);
    const fake = fakeMint(clock, 3600);

    await cache.getOrMint('sandbox:p1', fake.mint);
    clock.advanceMs((3600 - 61) * 1000);
    expect((await cache.getOrMint('sandbox:p1', fake.mint)).accessToken).toBe('tok-1');

    clock.advanceMs(1000);
    expect((await cache.getOrMint('sandbox:p1', fake.mint)).accessToken).toBe('tok-2');
    expect(fake.mints()).toBe(2);
    expect(EXPIRY_SKEW_MS).toBe(60_000);
  });

  it('shares one mint between concurrent callers', async () => {
    const clock = fakeClock('2026-05-01T12:00:00.000Z');
    const cache = new TokenCache(clock.now);
    const fake = fakeMint(clock);

    const results = await Promise.all([
      cache.getOrMint('sandbox:p1', fake.mint),
      cache.getOrMint('sandbox:p1', fake.mint),
      cache.getOrMint('sandbox:p1', fake.mint)
    ]);

    expect(results.map((r) => r.accessToken)).toEqual(['tok-1', 'tok-1', 'tok-1']);
    expect(fake.mints()).toBe(1);
  });

  it('does not cache a failed mint, so the next call tries again', async () => {
    const clock = fakeClock('2026-05-01T12:00:00.000Z');
    const cache = new TokenCache(clock.now);
    let calls = 0;
    const mint = async (): Promise<PartnerToken> => {
      calls += 1;
      if (calls === 1) throw new NoActiveAuthClientError('sandbox', 'p1');
      return { accessToken: 'tok-ok', expiresAt: new Date(clock.now().getTime() + 3_600_000) };
    };

    await expect(cache.getOrMint('sandbox:p1', mint)).rejects.toBeInstanceOf(NoActiveAuthClientError);
    expect((await cache.getOrMint('sandbox:p1', mint)).accessToken).toBe('tok-ok');
    expect(calls).toBe(2);
  });

  it('clear() drops every entry, so the next call mints again', async () => {
    const clock = fakeClock('2026-05-01T12:00:00.000Z');
    const cache = new TokenCache(clock.now);
    const fake = fakeMint(clock);

    await cache.getOrMint('sandbox:p1', fake.mint);
    cache.clear();
    await cache.getOrMint('sandbox:p1', fake.mint);

    expect(fake.mints()).toBe(2);
  });
});
