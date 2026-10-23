import { isProductionEnvName, selectTitleBarMarkVariant } from './zest-mark';

const state = ({ collEnv, globalEnv, withTab = true } = {}) => ({
  tabs: { activeTabUid: withTab ? 't1' : null, tabs: [{ uid: 't1', collectionUid: 'c1' }] },
  collections: {
    collections: [{ uid: 'c1', activeEnvironmentUid: collEnv ? 'e1' : null, environments: [{ uid: 'e1', name: collEnv }] }]
  },
  globalEnvironments: {
    activeGlobalEnvironmentUid: globalEnv ? 'g1' : null,
    globalEnvironments: [{ uid: 'g1', name: globalEnv }]
  }
});

describe('production mark rule', () => {
  it.each([['Production', true], ['prod-eu', true], [' PROD', true], ['Staging', false], ['reproduce', false], [undefined, false]])(
    'isProductionEnvName(%s) = %s', (n, e) => expect(isProductionEnvName(n)).toBe(e)
  );

  it('uses production for a prod collection env', () => {
    expect(selectTitleBarMarkVariant(state({ collEnv: 'Production' }))).toBe('production');
  });
  it('uses production for a prod global env with no tab', () => {
    expect(selectTitleBarMarkVariant(state({ globalEnv: 'prod', withTab: false }))).toBe('production');
  });
  it('uses dark otherwise', () => {
    expect(selectTitleBarMarkVariant(state({ collEnv: 'Staging' }))).toBe('dark');
    expect(selectTitleBarMarkVariant(state())).toBe('dark');
  });
});
