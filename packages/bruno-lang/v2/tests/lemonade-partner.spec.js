const bruToJson = require('../src/bruToJson');
const jsonToBru = require('../src/jsonToBru');
const collectionBruToJson = require('../src/collectionBruToJson');
const jsonToCollectionBru = require('../src/jsonToCollectionBru');

describe('auth:lemonade-partner', () => {
  const lemonadePartner = { env: '{{env}}', partnerPublicId: '{{partnerPublicId}}' };

  it('request: writes the block', () => {
    const bru = jsonToBru({
      meta: { name: 'r', type: 'http' },
      http: { method: 'post', url: '{{publicApis}}/x', auth: 'lemonade-partner', body: 'none' },
      auth: { lemonadePartner }
    });
    expect(bru).toContain('auth:lemonade-partner {\n  env: {{env}}\n  partnerPublicId: {{partnerPublicId}}\n}');
  });

  it('request: round trips', () => {
    const json = {
      meta: { name: 'r', type: 'http' },
      http: { method: 'post', url: '{{publicApis}}/x', auth: 'lemonade-partner', body: 'none' },
      auth: { lemonadePartner: { env: 'sandbox', partnerPublicId: 'ptr_abc123' } }
    };
    const parsed = bruToJson(jsonToBru(json));
    expect(parsed.http.auth).toBe('lemonade-partner');
    expect(parsed.auth.lemonadePartner).toEqual({ env: 'sandbox', partnerPublicId: 'ptr_abc123' });
  });

  it('request: missing fields parse as empty strings', () => {
    const parsed = bruToJson('auth:lemonade-partner {\n}\n');
    expect(parsed.auth.lemonadePartner).toEqual({ env: '', partnerPublicId: '' });
  });

  it('collection: round trips', () => {
    const json = { auth: { mode: 'lemonade-partner', lemonadePartner } };
    const bru = jsonToCollectionBru(json);
    expect(bru).toContain('auth:lemonade-partner {\n  env: {{env}}\n  partnerPublicId: {{partnerPublicId}}\n}');
    const parsed = collectionBruToJson(bru);
    expect(parsed.auth.mode).toBe('lemonade-partner');
    expect(parsed.auth.lemonadePartner).toEqual(lemonadePartner);
  });
});
