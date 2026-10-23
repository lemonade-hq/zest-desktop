import { describe, expect, it } from '@jest/globals';
import {
  ACCESS_TOKEN,
  AGENT_PASSWORD,
  PARTNER_ID,
  capturingLogger,
  chainHandler,
  fakeClock,
  jsonResult,
  partnersPage,
  scriptedTransport
} from './test-support';
import { ZestAuth } from './zest-auth';

const NOW = '2026-05-01T12:00:00.000Z';

function authFor(handler: Parameters<typeof scriptedTransport>[0]) {
  const { transport, requests } = scriptedTransport(handler);
  const { logger, lines } = capturingLogger();
  const clock = fakeClock(NOW);
  const auth = new ZestAuth({ transport, now: clock.now, log: logger });
  return { auth, requests, lines, clock };
}

describe('ZestAuth.listPartners', () => {
  it('caches per env for the session: a second call makes no request', async () => {
    const { auth, requests } = authFor(() =>
      jsonResult(partnersPage([{ publicId: 'p_a', name: 'Acme', code: 'acme' }]))
    );

    const first = await auth.listPartners('sandbox');
    const second = await auth.listPartners('sandbox');

    expect(first).toEqual([{ publicId: 'p_a', name: 'Acme', code: 'acme' }]);
    expect(second).toBe(first);
    expect(requests.length).toBe(1);
  });

  it('caches each env separately', async () => {
    const { auth, requests } = authFor(() =>
      jsonResult(partnersPage([{ publicId: 'p_a', name: 'Acme', code: 'acme' }]))
    );

    await auth.listPartners('sandbox');
    await auth.listPartners('staging');

    expect(requests.length).toBe(2);
    expect(requests[0]?.url).toContain('partners-sandbox');
    expect(requests[1]?.url).toContain('partners-master');
  });

  it('does not cache a failed list, so the next call retries', async () => {
    let calls = 0;
    const { auth } = authFor(() => {
      calls += 1;
      if (calls === 1) return { status: 503, headers: {}, body: '' };
      return jsonResult(partnersPage([{ publicId: 'p_a', name: 'Acme', code: 'acme' }]));
    });

    await expect(auth.listPartners('sandbox')).rejects.toThrow('partners-service (sandbox) returned 503');
    await expect(auth.listPartners('sandbox')).resolves.toEqual([{ publicId: 'p_a', name: 'Acme', code: 'acme' }]);
    expect(calls).toBe(2);
  });

  it('clearCache() forces a refetch', async () => {
    const { auth, requests } = authFor(() =>
      jsonResult(partnersPage([{ publicId: 'p_a', name: 'Acme', code: 'acme' }]))
    );

    await auth.listPartners('sandbox');
    auth.clearCache();
    await auth.listPartners('sandbox');

    expect(requests.length).toBe(2);
  });
});

describe('ZestAuth.partnerToken', () => {
  it('caches per `${env}:${publicId}` until inside the expiry margin', async () => {
    const { auth, requests, clock } = authFor(chainHandler());

    const first = await auth.partnerToken('sandbox', PARTNER_ID);
    const second = await auth.partnerToken('sandbox', PARTNER_ID);
    expect(second).toBe(first);
    expect(requests.length).toBe(3);

    // still fresh just outside the 60 s margin
    clock.advanceMs((3600 - 61) * 1000);
    await auth.partnerToken('sandbox', PARTNER_ID);
    expect(requests.length).toBe(3);

    // inside the margin: a fresh chain runs
    clock.advanceMs(1000);
    const third = await auth.partnerToken('sandbox', PARTNER_ID);
    expect(third).not.toBe(first);
    expect(requests.length).toBe(6);
  });

  it('keys by env and partner, so another key mints its own token', async () => {
    const { auth, requests } = authFor(chainHandler());

    await auth.partnerToken('sandbox', PARTNER_ID);
    await auth.partnerToken('sandbox', 'partner_other');
    await auth.partnerToken('production', PARTNER_ID);

    expect(requests.length).toBe(9);
  });

  it('clearCache() forces a re-mint', async () => {
    const { auth, requests } = authFor(chainHandler());

    await auth.partnerToken('sandbox', PARTNER_ID);
    auth.clearCache();
    await auth.partnerToken('sandbox', PARTNER_ID);

    expect(requests.length).toBe(6);
  });
});

describe('ZestAuth.agentToken', () => {
  it('is never cached: two logins make two requests', async () => {
    const { auth, requests } = authFor(() => jsonResult({ accessToken: 'agent_jwt_ABC' }));

    await auth.agentToken('sandbox', ACCESS_TOKEN, 'a@x.com', AGENT_PASSWORD);
    await auth.agentToken('sandbox', ACCESS_TOKEN, 'a@x.com', AGENT_PASSWORD);

    expect(requests.length).toBe(2);
  });
});

describe('ZestAuth defaults', () => {
  it('works with only a transport: no now, no log', async () => {
    const { transport } = scriptedTransport(chainHandler());
    const auth = new ZestAuth({ transport });

    const token = await auth.partnerToken('sandbox', PARTNER_ID);

    expect(token.accessToken).toBe(ACCESS_TOKEN);
    // real clock: expiry is ~1 h ahead
    const aheadMs = token.expiresAt.getTime() - Date.now();
    expect(aheadMs).toBeGreaterThan(3590 * 1000);
    expect(aheadMs).toBeLessThanOrEqual(3600 * 1000);
  });
});
