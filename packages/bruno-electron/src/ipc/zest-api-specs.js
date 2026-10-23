/**
 * Zest: API Spec sync (renderer:sync-api-spec), first-launch preload and launch-time sync.
 * See src/zest/api-spec-*.js for the logic; this file wires it to Electron.
 */
const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');
const { PUBLIC_APIS_SNAPSHOT_ID } = require('@lemonade-hq/zest-core');
const { getCertsAndProxyConfig } = require('./network/cert-utils');
const { makeAxiosInstance } = require('./network/axios-instance');
const { readWorkspaceConfig, addApiSpecToWorkspace, getWorkspaceApiSpecs, getWorkspaceUid } = require('../utils/workspace-config');
const { createApiSpecSyncer } = require('../zest/api-spec-sync');
const { createSyncStateStore, isStale } = require('../zest/api-spec-sync-state');
const { seedPreloadedApiSpecs } = require('../zest/api-spec-preload');
const { sanitizeApiSpecSource } = require('../zest/api-spec-source');

const SNAPSHOT_FILES = {
  [PUBLIC_APIS_SNAPSHOT_ID]: 'public-apis-openapi.json'
};

const snapshotDir = () => (app.isPackaged
  ? path.join(process.resourcesPath, 'data', 'zest')
  : path.join(app.getAppPath(), 'resources', 'data', 'zest'));

const readSnapshot = (id) => {
  const filename = SNAPSHOT_FILES[id];
  if (!filename) return null;
  try {
    return fs.readFileSync(path.join(snapshotDir(), filename), 'utf8');
  } catch (err) {
    console.error(`[zest] bundled API spec snapshot not found: ${filename}`);
    return null;
  }
};

// Same proxy-aware fetch as renderer:fetch-api-spec in ipc/apiSpec.js.
const fetchText = async (url) => {
  const { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions } = await getCertsAndProxyConfig({
    collectionUid: null,
    collection: { promptVariables: {} },
    request: {},
    envVars: {},
    runtimeVariables: {},
    processEnvVars: {},
    collectionPath: '',
    globalEnvironmentVariables: {}
  });
  const axiosInstance = makeAxiosInstance({ proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions });
  const response = await axiosInstance.get(url, { timeout: 30000, transformResponse: [(data) => data] });
  return response.data;
};

let stateStore = null;
const getStateStore = () => {
  if (!stateStore) stateStore = createSyncStateStore(() => app.getPath('userData'));
  return stateStore;
};

let syncer = null;
const getSyncer = () => {
  if (!syncer) syncer = createApiSpecSyncer({ fetchText, readSnapshot, stateStore: getStateStore() });
  return syncer;
};

let flagStore = null;
const getFlagStore = () => {
  if (!flagStore) {
    const Store = require('electron-store');
    flagStore = new Store({ name: 'zest' });
  }
  return flagStore;
};

let mainWindowRef = null;

const notifyWorkspace = (workspacePath) => {
  if (!mainWindowRef || mainWindowRef.isDestroyed?.()) return;
  try {
    const config = readWorkspaceConfig(workspacePath);
    const workspaceUid = getWorkspaceUid(workspacePath);
    const configForClient = workspaceUid === 'default' ? { ...config, name: 'My Workspace', type: 'default' } : config;
    mainWindowRef.webContents.send('main:workspace-config-updated', workspacePath, workspaceUid, configForClient);
  } catch (err) {
    console.error('[zest] failed to notify workspace update', err);
  }
};

const findSpec = (workspacePath, specPath) => getWorkspaceApiSpecs(workspacePath)
  .find((spec) => spec.path && path.normalize(spec.path) === path.normalize(specPath));

const syncWorkspaceApiSpec = async (workspacePath, specPath) => {
  const spec = findSpec(workspacePath, specPath);
  if (!spec) throw new Error('API spec not found in workspace');
  const result = await getSyncer().syncApiSpec({ specPath: spec.path, source: spec.source });
  notifyWorkspace(workspacePath);
  return result;
};

/** Adds `syncState` and `stale` to each spec returned by renderer:load-workspace-apispecs. */
const attachApiSpecSyncState = (spec) => {
  if (!spec || !spec.source || !spec.path) return spec;
  const syncState = getStateStore().get(spec.path);
  return { ...spec, syncState, stale: isStale(syncState) };
};

const launchSynced = new Set();
const preloadInFlight = new Map();

/**
 * Called from defaultWorkspaceManager.ensureDefaultWorkspaceExists(). Seeds the preloaded spec on
 * first launch, then syncs every `syncOnLaunch` spec once per process, in the background.
 */
const onDefaultWorkspaceReady = (workspacePath) => {
  if (!workspacePath || preloadInFlight.has(workspacePath)) return preloadInFlight.get(workspacePath);

  const run = (async () => {
    try {
      await seedPreloadedApiSpecs(workspacePath, {
        flagStore: getFlagStore(),
        syncer: getSyncer(),
        readWorkspaceConfig,
        addApiSpecToWorkspace
      });
    } catch (err) {
      console.error('[zest] failed to preload API specs', err);
    }

    try {
      for (const spec of getWorkspaceApiSpecs(workspacePath)) {
        if (!spec.source?.syncOnLaunch || !spec.path || launchSynced.has(spec.path)) continue;
        launchSynced.add(spec.path);
        syncWorkspaceApiSpec(workspacePath, spec.path).catch((err) => console.warn('[zest] launch sync failed', err.message));
      }
    } catch (err) {
      console.error('[zest] failed to start launch-time API spec sync', err);
    }
  })();

  preloadInFlight.set(workspacePath, run);
  return run;
};

const registerZestApiSpecIpc = (mainWindow) => {
  mainWindowRef = mainWindow;

  ipcMain.handle('renderer:sync-api-spec', async (event, specPath, workspacePath) => {
    const result = await syncWorkspaceApiSpec(workspacePath, specPath);
    return { ok: result.ok, changed: result.changed, error: result.state?.error || null, stale: isStale(result.state) };
  });

  // Records where a spec was created from (Create API Spec → From URL), so Sync from source works for it.
  ipcMain.handle('renderer:set-api-spec-source', async (event, specPath, workspacePath, source) => {
    const spec = findSpec(workspacePath, specPath);
    if (!spec) throw new Error('API spec not found in workspace');
    const sanitized = sanitizeApiSpecSource(source);
    if (!sanitized || !sanitized.url) throw new Error('A source URL is required');
    await addApiSpecToWorkspace(workspacePath, { name: spec.name, path: spec.path, source: sanitized });
    getStateStore().set(spec.path, { contentFrom: 'url', lastAttemptAt: new Date().toISOString(), lastSuccessAt: new Date().toISOString(), error: null });
    notifyWorkspace(workspacePath);
  });
};

module.exports = registerZestApiSpecIpc;
module.exports.onDefaultWorkspaceReady = onDefaultWorkspaceReady;
module.exports.attachApiSpecSyncState = attachApiSpecSyncState;
