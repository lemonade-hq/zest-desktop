const { parseBruRequest, stringifyBruRequest, parseBruCollection, stringifyBruCollection } = require('../index');

const lemonadePartner = { env: '{{env}}', partnerPublicId: '{{partnerPublicId}}' };

describe('bru: lemonade-partner auth', () => {
  it('round-trips a request', () => {
    const request = {
      name: 'Create application',
      type: 'http-request',
      seq: 1,
      request: {
        method: 'POST',
        url: '{{publicApis}}/api/v3/fr/renters/applications',
        headers: [],
        params: [],
        body: { mode: 'none' },
        auth: { mode: 'lemonade-partner', lemonadePartner },
        vars: {},
        assertions: [],
        script: {},
        tests: ''
      }
    };
    const bru = stringifyBruRequest(request);
    expect(bru).toContain('auth: lemonade-partner');
    expect(bru).toContain('auth:lemonade-partner {');
    const parsed = parseBruRequest(bru);
    expect(parsed.request.auth.mode).toBe('lemonade-partner');
    expect(parsed.request.auth.lemonadePartner).toEqual(lemonadePartner);
  });

  it('round-trips a collection / folder root', () => {
    const root = { request: { auth: { mode: 'lemonade-partner', lemonadePartner: { env: 'sandbox', partnerPublicId: 'ptr_1' } } } };
    const parsed = parseBruCollection(stringifyBruCollection(root));
    expect(parsed.request.auth.mode).toBe('lemonade-partner');
    expect(parsed.request.auth.lemonadePartner).toEqual({ env: 'sandbox', partnerPublicId: 'ptr_1' });
  });
});
