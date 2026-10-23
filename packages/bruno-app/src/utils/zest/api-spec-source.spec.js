import { describeApiSpecStaleness } from './api-spec-source';

describe('describeApiSpecStaleness', () => {
  it('is null for an up-to-date spec', () => {
    expect(describeApiSpecStaleness({ stale: false, syncState: { contentFrom: 'url' } })).toBeNull();
    expect(describeApiSpecStaleness({})).toBeNull();
  });

  it('explains the bundled offline copy and the last error', () => {
    const text = describeApiSpecStaleness({ stale: true, syncState: { contentFrom: 'snapshot', error: 'Could not reach x (ENOTFOUND)' } });
    expect(text).toContain('bundled offline copy');
    expect(text).toContain('ENOTFOUND');
  });
});
