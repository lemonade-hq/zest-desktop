import { createSelector } from '@reduxjs/toolkit';

export const isProductionEnvName = (name) => /^prod/i.test(typeof name === 'string' ? name.trim() : '');

const selectActiveCollection = (state) => {
  const activeTabUid = state.tabs?.activeTabUid;
  const tab = state.tabs?.tabs?.find((t) => t.uid === activeTabUid);
  return state.collections?.collections?.find((c) => c.uid === tab?.collectionUid);
};

const selectActiveGlobalEnvironment = (state) => {
  const ge = state.globalEnvironments;
  return ge?.globalEnvironments?.find((e) => e.uid === ge.activeGlobalEnvironmentUid);
};

export const selectTitleBarMarkVariant = createSelector(
  [selectActiveCollection, selectActiveGlobalEnvironment],
  (collection, globalEnv) => {
    const collectionEnv = collection?.environments?.find((e) => e.uid === collection.activeEnvironmentUid);
    return [collectionEnv, globalEnv].some((e) => isProductionEnvName(e?.name)) ? 'production' : 'dark';
  }
);
