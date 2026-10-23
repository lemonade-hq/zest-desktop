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
