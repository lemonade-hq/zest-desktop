import { toOpenCollectionAuth, toBrunoAuth } from './auth';
import stringifyFolder from '../stringifyFolder';
import parseFolder from '../parseFolder';

const partner = { env: '{{env}}', partnerPublicId: '{{partnerPublicId}}' };

describe('lemonade-partner auth (yml)', () => {
  it('serializes to type lemonade-partner', () => {
    expect(toOpenCollectionAuth({ mode: 'lemonade-partner', lemonadePartner: partner } as any)).toEqual({
      type: 'lemonade-partner',
      ...partner
    });
  });

  it('round-trips through toBrunoAuth', () => {
    const oc = toOpenCollectionAuth({ mode: 'lemonade-partner', lemonadePartner: partner } as any);
    const bruno = toBrunoAuth(oc as any);
    expect(bruno?.mode).toBe('lemonade-partner');
    expect(bruno?.lemonadePartner).toEqual(partner);
  });

  it('round-trips through a folder.yml', () => {
    const folderRoot = {
      meta: { name: 'f', seq: 1 },
      request: {
        headers: [],
        auth: { mode: 'lemonade-partner', lemonadePartner: { env: 'sandbox', partnerPublicId: 'ptr_1' } },
        script: { req: null, res: null },
        tests: null,
        vars: { req: [], res: [] }
      },
      docs: null
    } as any;
    const yml = stringifyFolder(folderRoot);
    expect(yml).toContain('lemonade-partner');
    const reparsed = parseFolder(yml);
    expect(reparsed.request?.auth?.mode).toBe('lemonade-partner');
    expect(reparsed.request?.auth?.lemonadePartner).toEqual({ env: 'sandbox', partnerPublicId: 'ptr_1' });
  });
});

describe('lemonade-partner auth in a request item (yml)', () => {
  it('survives stringifyItem → parseItem', () => {
    const stringifyItem = require('../stringifyItem').default;
    const parseItem = require('../parseItem').default;
    const item = {
      name: 'Create application',
      type: 'http-request',
      seq: 1,
      request: {
        method: 'POST',
        url: '{{publicApis}}/api/v3/fr/renters/applications',
        headers: [],
        params: [],
        body: { mode: 'none' },
        auth: { mode: 'lemonade-partner', lemonadePartner: { env: 'sandbox', partnerPublicId: 'ptr_1' } }
      }
    };
    const yml = stringifyItem(item);
    expect(yml).toContain('type: lemonade-partner');
    const parsed = parseItem(yml);
    expect(parsed.request.auth.mode).toBe('lemonade-partner');
    expect(parsed.request.auth.lemonadePartner).toEqual({ env: 'sandbox', partnerPublicId: 'ptr_1' });
  });
});
