import { describe, expect, it } from '@jest/globals';
import { AuthClientNotFoundError, NoActiveAuthClientError, UpstreamError } from './errors';
import { PartnersServiceCredentialSource } from './partners-service';
import {
  ACCESS_TOKEN,
  CLIENT_ID,
  CLIENT_SECRET,
  PARTNER_ID,
  capturingLogger,
  chainHandler,
  credentialsBody,
  fakeClock,
  jsonResult,
  partnersPage,
  scriptedTransport
} from './test-support';

const NOW = '2026-05-01T12:00:00.000Z';

function sourceFor(handler: Parameters<typeof scriptedTransport>[0]) {
  const { transport, requests } = scriptedTransport(handler);
  const { logger, lines } = capturingLogger();
  const clock = fakeClock(NOW);
  const source = new PartnersServiceCredentialSource('sandbox', { transport, logger, now: clock.now });
  return { source, requests, lines, clock };
}

describe('PartnersServiceCredentialSource.partnerToken', () => {
  it('runs the calls in order and returns the token with its expiry', async () => {
    const { source, requests } = sourceFor(chainHandler());

    const token = await source.partnerToken(PARTNER_ID);

    expect(token.accessToken).toBe(ACCESS_TOKEN);
    expect(token.expiresAt.toISOString()).toBe('2026-05-01T13:00:00.000Z');
    expect(requests.map((r) => [r.method, r.url])).toEqual([
      ['GET', `https://partners-sandbox.lmndsandbox.com/api/v3/partners/${PARTNER_ID}/distributions/api/credentials`],
      ['GET', `https://auth-sandbox.lmndsandbox.com/api/v1/clients/${CLIENT_ID}`],
      ['POST', 'https://auth-sandbox.lmndsandbox.com/oauth-partners/token']
    ]);
    const form = new URLSearchParams(requests[2]?.body);
    expect(requests[2]?.headers?.['content-type']).toBe('application/x-www-form-urlencoded');
    expect(Object.fromEntries(form)).toEqual({
      grant_type: 'client_credentials',
      response_type: 'token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });
  });

  it('picks the active auth_client and ignores other credential types and inactive ones', async () => {
    const { source, requests } = sourceFor(
      chainHandler({
        credentials: credentialsBody([
          { type: 'api_key', name: 'key-1', active: true },
          { type: 'auth_client', name: 'client-old', active: false },
          { type: 'auth_client', name: CLIENT_ID, active: true }
        ])
      })
    );

    await source.partnerToken(PARTNER_ID);

    expect(requests[1]?.url.endsWith(`/api/v1/clients/${CLIENT_ID}`)).toBe(true);
  });

  it('reports an inactive credential as a clear error and never calls auth-service', async () => {
    const { source, requests, lines } = sourceFor(
      chainHandler({ credentials: credentialsBody([{ type: 'auth_client', name: CLIENT_ID, active: false }]) })
    );

    await expect(source.partnerToken(PARTNER_ID)).rejects.toThrow(
      new NoActiveAuthClientError('sandbox', PARTNER_ID)
    );
    expect(requests.length).toBe(1);
    expect(lines.length).toBe(1);
  });

  it('reports an auth-service 404 as a clear error', async () => {
    const { source } = sourceFor(chainHandler({ client: jsonResult({ message: 'nope' }, 404) }));

    const error = await source.partnerToken(PARTNER_ID).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthClientNotFoundError);
    expect((error as AuthClientNotFoundError).message).toBe(
      `Auth client ${CLIENT_ID} not found in auth-service (sandbox)`
    );
  });

  it('reports a partners-service 503 with its status', async () => {
    const { source } = sourceFor(() => ({ status: 503, headers: {}, body: '' }));

    const error = await source.partnerToken(PARTNER_ID).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).message).toBe('partners-service (sandbox) returned 503');
    expect((error as UpstreamError).status).toBe(503);
  });

  it('reports a network failure as an unusable response, with no status', async () => {
    const { source } = sourceFor(() => {
      throw new Error('socket hang up');
    });

    const error = await source.partnerToken(PARTNER_ID).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).status).toBeNull();
    expect((error as UpstreamError).message).toBe('partners-service (sandbox) returned an unusable response');
  });

  it('rejects a token response that is missing access_token', async () => {
    const { source } = sourceFor(chainHandler({ token: jsonResult({ expires_in: 3600 }) }));

    await expect(source.partnerToken(PARTNER_ID)).rejects.toBeInstanceOf(UpstreamError);
  });

  it('rejects a token response that is not JSON at all', async () => {
    const { source } = sourceFor(chainHandler({ token: { status: 200, headers: {}, body: '<html>nope</html>' } }));

    await expect(source.partnerToken(PARTNER_ID)).rejects.toBeInstanceOf(UpstreamError);
  });

  it('logs the mint without the secret or the token', async () => {
    const { source, lines } = sourceFor(chainHandler());

    await source.partnerToken(PARTNER_ID);

    expect(lines.length).toBe(1);
    expect(lines[0]?.message).toBe('auth: minted partner token');
    expect(lines[0]?.fields).toEqual({
      env: 'sandbox',
      partnerPublicId: PARTNER_ID,
      clientId: CLIENT_ID,
      expiresAt: '2026-05-01T13:00:00.000Z'
    });
  });
});

describe('PartnersServiceCredentialSource on staging', () => {
  function stagingSource(handler: Parameters<typeof scriptedTransport>[0]) {
    const { transport, requests } = scriptedTransport(handler);
    const { logger } = capturingLogger();
    const source = new PartnersServiceCredentialSource('staging', { transport, logger, now: fakeClock(NOW).now });
    return { source, requests };
  }

  it('mints through partners-master and auth-master', async () => {
    const { source, requests } = stagingSource(chainHandler());

    const token = await source.partnerToken(PARTNER_ID);

    expect(token.accessToken).toBe(ACCESS_TOKEN);
    expect(requests.map((r) => [r.method, r.url])).toEqual([
      ['GET', `https://partners-master.lmndstaging.com/api/v3/partners/${PARTNER_ID}/distributions/api/credentials`],
      ['GET', `https://auth-master.lmndstaging.com/api/v1/clients/${CLIENT_ID}`],
      ['POST', 'https://auth-master.lmndstaging.com/oauth-partners/token']
    ]);
  });

  it('lists partners from partners-master', async () => {
    const { source, requests } = stagingSource(() => jsonResult(partnersPage([])));

    await source.listPartners();

    expect(requests[0]?.url.startsWith('https://partners-master.lmndstaging.com/api/v3/partners?')).toBe(true);
  });
});

describe('PartnersServiceCredentialSource on production', () => {
  it('mints through the production hosts', async () => {
    const { transport, requests } = scriptedTransport(chainHandler());
    const { logger } = capturingLogger();
    const source = new PartnersServiceCredentialSource('production', { transport, logger, now: fakeClock(NOW).now });

    const token = await source.partnerToken(PARTNER_ID);

    expect(token.accessToken).toBe(ACCESS_TOKEN);
    expect(requests.map((r) => r.url)).toEqual([
      `https://partners-production.lmndprod.com/api/v3/partners/${PARTNER_ID}/distributions/api/credentials`,
      `https://auth-production.lmndprod.com/api/v1/clients/${CLIENT_ID}`,
      'https://auth-production.lmndprod.com/oauth-partners/token'
    ]);
  });
});

describe('PartnersServiceCredentialSource.listPartners', () => {
  it('reads every page, lists every partner, and sorts them by name', async () => {
    const { source, requests } = sourceFor((request) => {
      const page = new URL(request.url).searchParams.get('page');
      if (page === '1') {
        return jsonResult(
          partnersPage(
            [
              { publicId: 'p_z', name: 'Zed Insurance', code: 'zed', status: 'active' },
              { publicId: 'p_i', name: 'Idle Co', code: 'idle', status: 'inactive' }
            ],
            2
          )
        );
      }
      return jsonResult(partnersPage([{ publicId: 'p_a', name: 'Acme', code: 'acme', status: 'active' }], 2));
    });

    const partners = await source.listPartners();

    expect(partners).toEqual([
      { publicId: 'p_a', name: 'Acme', code: 'acme' },
      { publicId: 'p_i', name: 'Idle Co', code: 'idle' },
      { publicId: 'p_z', name: 'Zed Insurance', code: 'zed' }
    ]);
    expect(requests.map((r) => new URL(r.url).searchParams.get('page'))).toEqual(['1', '2']);
    expect(new URL(requests[0]?.url ?? '').searchParams.get('size')).toBe('100');
  });

  it('lists partners from a sandbox-shaped page that has no status field', async () => {
    const { source } = sourceFor(() =>
      jsonResult(
        partnersPage([
          { publicId: 'PRTNR29-147-277', name: 'Zeta', code: 'zeta' },
          { publicId: 'PRTNR1-1-1', name: 'Alpha', code: 'alpha' }
        ])
      )
    );

    await expect(source.listPartners()).resolves.toEqual([
      { publicId: 'PRTNR1-1-1', name: 'Alpha', code: 'alpha' },
      { publicId: 'PRTNR29-147-277', name: 'Zeta', code: 'zeta' }
    ]);
  });

  it('stops on an empty page even when stats says there are more', async () => {
    const { source, requests } = sourceFor(() => jsonResult(partnersPage([], 5)));

    await expect(source.listPartners()).resolves.toEqual([]);
    expect(requests.length).toBe(1);
  });

  it('makes no credential calls when listing', async () => {
    const { source, requests } = sourceFor(() => jsonResult(partnersPage([], 1)));

    await source.listPartners();

    expect(requests.every((r) => r.url.includes('/api/v3/partners?'))).toBe(true);
  });
});
