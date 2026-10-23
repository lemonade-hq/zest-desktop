const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');
const { seedPreloadedApiSpecs, PRELOADED_FLAG } = require('../../src/zest/api-spec-preload');
const { createApiSpecSyncer } = require('../../src/zest/api-spec-sync');
const { createSyncStateStore } = require('../../src/zest/api-spec-sync-state');
const { readWorkspaceConfig, addApiSpecToWorkspace } = require('../../src/utils/workspace-config');

const snapshotText = fs.readFileSync(path.join(__dirname, '../../resources/data/zest/public-apis-openapi.json'), 'utf8');

const memoryFlagStore = () => {
  const values = {};
  return { get: (k) => values[k], set: (k, v) => { values[k] = v; } };
};

describe('seedPreloadedApiSpecs', () => {
  let workspacePath;
  let deps;

  const writeWorkspaceYml = (specsYaml = 'specs: []') => {
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), [
      'opencollection: 1.0.0',
      'info:',
      '  name: My Workspace',
      '  type: workspace',
      'collections: []',
      specsYaml,
      'docs: \'\''
    ].join('\n'));
  };

  beforeEach(() => {
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'zest-ws-'));
    writeWorkspaceYml();
    deps = {
      flagStore: memoryFlagStore(),
      syncer: createApiSpecSyncer({
        fetchText: async () => { throw new Error('unused'); },
        readSnapshot: () => snapshotText,
        stateStore: createSyncStateStore(() => workspacePath)
      }),
      readWorkspaceConfig,
      addApiSpecToWorkspace
    };
  });

  afterEach(() => fs.rmSync(workspacePath, { recursive: true, force: true }));

  it('adds "Lemonade public-apis" with its source block, offline, from the v3-only snapshot', async () => {
    const result = await seedPreloadedApiSpecs(workspacePath, deps);
    expect(result.seeded).toBe(true);

    const config = yaml.load(fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8'));
    expect(config.specs).toEqual([{
      name: 'Lemonade public-apis',
      path: 'apispec/Lemonade public-apis.json',
      source: {
        url: 'https://public-apis-master.lmndstaging.com/api-json',
        includePaths: ['/api/v3/**'],
        baseUrlVariable: 'publicApis',
        authPreset: 'lemonade',
        fallback: 'bundled:public-apis',
        syncOnLaunch: true
      }
    }]);

    const spec = JSON.parse(fs.readFileSync(path.join(workspacePath, 'apispec', 'Lemonade public-apis.json'), 'utf8'));
    expect(Object.keys(spec.paths).every((p) => p.startsWith('/api/v3/'))).toBe(true);
    expect(deps.flagStore.get(PRELOADED_FLAG)).toBe(true);
  });

  it('does nothing a second time, even after the user removed the spec', async () => {
    await seedPreloadedApiSpecs(workspacePath, deps);
    writeWorkspaceYml();
    const again = await seedPreloadedApiSpecs(workspacePath, deps);
    expect(again).toEqual({ seeded: false, reason: 'already-preloaded' });
    expect(readWorkspaceConfig(workspacePath).specs).toEqual([]);
  });

  it('skips a workspace that already has API specs', async () => {
    writeWorkspaceYml('specs:\n  - name: mine\n    path: apispec/mine.yaml');
    const result = await seedPreloadedApiSpecs(workspacePath, deps);
    expect(result).toEqual({ seeded: false, reason: 'workspace-has-specs' });
    expect(readWorkspaceConfig(workspacePath).specs).toHaveLength(1);
    expect(deps.flagStore.get(PRELOADED_FLAG)).toBe(true);
  });

  it('keeps the source block when the spec is re-added without one', async () => {
    await seedPreloadedApiSpecs(workspacePath, deps);
    await addApiSpecToWorkspace(workspacePath, { name: 'Lemonade public-apis', path: path.join(workspacePath, 'apispec', 'Lemonade public-apis.json') });
    expect(readWorkspaceConfig(workspacePath).specs[0].source.includePaths).toEqual(['/api/v3/**']);
  });
});
