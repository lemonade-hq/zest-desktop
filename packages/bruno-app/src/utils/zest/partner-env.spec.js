import { filterPartners, getLemonadePartnerConfig, isKnownPartnerEnv, resolvePartnerEnv } from './partner-env';

describe('partner-env', () => {
  it('fills defaults for a missing config', () => {
    expect(getLemonadePartnerConfig({ mode: 'lemonade-partner' })).toEqual({ env: '{{env}}', partnerPublicId: '{{partnerPublicId}}' });
    expect(getLemonadePartnerConfig({ lemonadePartner: { env: 'sandbox', partnerPublicId: 'p' } })).toEqual({ env: 'sandbox', partnerPublicId: 'p' });
  });

  it('keeps an explicitly empty value', () => {
    expect(getLemonadePartnerConfig({ lemonadePartner: { env: '', partnerPublicId: '' } })).toEqual({ env: '', partnerPublicId: '' });
  });

  it('resolves {{env}}', () => {
    expect(resolvePartnerEnv('{{env}}', { env: ' production ' })).toBe('production');
    expect(resolvePartnerEnv('sandbox', {})).toBe('sandbox');
  });

  it('knows the three environments', () => {
    expect(['staging', 'sandbox', 'production'].every(isKnownPartnerEnv)).toBe(true);
    expect(isKnownPartnerEnv('{{env}}')).toBe(false);
  });

  it('filters by name, code or id', () => {
    const partners = [
      { name: 'Acme', code: 'ACM', publicId: 'ptr_1' },
      { name: 'Zed', code: 'ZED', publicId: 'ptr_2' }
    ];
    expect(filterPartners(partners, 'acm')).toEqual([partners[0]]);
    expect(filterPartners(partners, 'PTR_2')).toEqual([partners[1]]);
    expect(filterPartners(partners, '')).toEqual(partners);
  });
});
