const { describe, it, expect } = require('@jest/globals');
const { UpstreamError, NoActiveAuthClientError } = require('@lemonade-hq/zest-core');
const { prepareRequest } = require('../../src/ipc/network/prepare-request');
const { mintPartnerBearer, listPartners } = require('../../src/zest/partner-auth');
const interpolateVars = require('../../src/ipc/network/interpolate-vars');

const fakeZestAuth = (overrides = {}) => ({
  calls: [],
  async partnerToken(env, id) {
    this.calls.push([env, id]);
    return { accessToken: 'tok-123', expiresAt: new Date() };
  },
  async listPartners() {
    return [{ name: 'Acme', code: 'ACM', publicId: 'ptr_1', extra: 'dropped' }];
  },
  ...overrides
});

const baseRequest = (auth) => ({
  method: 'POST',
  url: '{{publicApis}}/x',
  body: { mode: 'none' },
  auth
});

describe('prepareRequest: lemonade-partner', () => {
  it('copies the config for a request-level mode', async () => {
    const request = baseRequest({ mode: 'lemonade-partner', lemonadePartner: { env: '{{env}}', partnerPublicId: 'ptr_9' } });
    const result = await prepareRequest({ request, collection: { pathname: '' } });
    expect(result.lemonadePartner).toEqual({ env: '{{env}}', partnerPublicId: 'ptr_9' });
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('defaults to {{env}} / {{partnerPublicId}} when the object is missing', async () => {
    const result = await prepareRequest({ request: baseRequest({ mode: 'lemonade-partner' }), collection: { pathname: '' } });
    expect(result.lemonadePartner).toEqual({ env: '{{env}}', partnerPublicId: '{{partnerPublicId}}' });
  });

  it('inherits the collection config', async () => {
    const collection = {
      pathname: '',
      root: { request: { auth: { mode: 'lemonade-partner', lemonadePartner: { env: 'sandbox', partnerPublicId: 'ptr_c' } } } }
    };
    const result = await prepareRequest({ request: baseRequest({ mode: 'inherit' }) }, collection);
    expect(result.lemonadePartner).toEqual({ env: 'sandbox', partnerPublicId: 'ptr_c' });
  });

  it('interpolates env and partner id', async () => {
    const result = await prepareRequest({
      request: baseRequest({ mode: 'lemonade-partner', lemonadePartner: { env: '{{env}}', partnerPublicId: '{{partnerPublicId}}' } })
    }, { pathname: '' });
    interpolateVars(result, { env: 'sandbox', partnerPublicId: 'ptr_7', publicApis: 'https://x' }, {}, {}, {});
    expect(result.lemonadePartner).toEqual({ env: 'sandbox', partnerPublicId: 'ptr_7' });
  });
});

describe('mintPartnerBearer', () => {
  it('returns a Bearer value', async () => {
    const zest = fakeZestAuth();
    await expect(mintPartnerBearer(zest, { env: 'sandbox', partnerPublicId: 'ptr_1' })).resolves.toBe('Bearer tok-123');
    expect(zest.calls).toEqual([['sandbox', 'ptr_1']]);
  });

  it('maps UpstreamError(null) to the VPN message', async () => {
    const zest = fakeZestAuth({ partnerToken: async () => { throw new UpstreamError('partners-service', 'sandbox', null); } });
    await expect(mintPartnerBearer(zest, { env: 'sandbox', partnerPublicId: 'ptr_1' })).rejects.toThrow(
      'Cannot reach partners-service for sandbox — are you on the VPN?'
    );
  });

  it('passes other zest-core messages through', async () => {
    const zest = fakeZestAuth({ partnerToken: async () => { throw new UpstreamError('auth-service', 'staging', 500); } });
    await expect(mintPartnerBearer(zest, { env: 'staging', partnerPublicId: 'p' })).rejects.toThrow('auth-service (staging) returned 500');
    const zest2 = fakeZestAuth({ partnerToken: async () => { throw new NoActiveAuthClientError('staging', 'p'); } });
    await expect(mintPartnerBearer(zest2, { env: 'staging', partnerPublicId: 'p' })).rejects.toThrow('no active auth_client');
  });

  it('rejects a bad env and an empty partner without calling zest-core', async () => {
    const zest = fakeZestAuth();
    await expect(mintPartnerBearer(zest, { env: '{{env}}', partnerPublicId: 'p' })).rejects.toThrow('env must be staging, sandbox or production');
    await expect(mintPartnerBearer(zest, { env: 'sandbox', partnerPublicId: '' })).rejects.toThrow('no partner selected');
    expect(zest.calls).toEqual([]);
  });

  it('never puts the token in an error message', async () => {
    const zest = fakeZestAuth({ partnerToken: async () => { throw new UpstreamError('auth-service', 'sandbox', null); } });
    await expect(mintPartnerBearer(zest, { env: 'sandbox', partnerPublicId: 'p' })).rejects.not.toThrow('tok-123');
  });
});

describe('listPartners', () => {
  it('returns name, code and publicId only', async () => {
    await expect(listPartners(fakeZestAuth(), 'sandbox')).resolves.toEqual([{ name: 'Acme', code: 'ACM', publicId: 'ptr_1' }]);
  });

  it('maps the VPN error', async () => {
    const zest = fakeZestAuth({ listPartners: async () => { throw new UpstreamError('partners-service', 'sandbox', null); } });
    await expect(listPartners(zest, 'sandbox')).rejects.toThrow('are you on the VPN?');
  });
});
