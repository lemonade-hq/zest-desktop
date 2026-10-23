/**
 * Zest: preload the Lemonade public-apis API Spec into the default workspace on first launch.
 *
 * 1. Skip when the flag is set, or when the workspace already lists API specs. Either way, set the
 *    flag, so a user who removes the spec does not get it back.
 * 2. Write the filtered bundled snapshot and add the workspace entry with its `source` block.
 *    This is synchronous and offline, so the sidebar shows the spec on the first render.
 * 3. The caller then syncs it from the URL in the background.
 */
const path = require('path');
const { PUBLIC_APIS_SPEC } = require('@lemonade-hq/zest-core');

const PRELOADED_FLAG = 'preloaded.publicApis';

const seedPreloadedApiSpecs = async (workspacePath, { flagStore, syncer, readWorkspaceConfig, addApiSpecToWorkspace }) => {
  if (flagStore.get(PRELOADED_FLAG)) {
    return { seeded: false, reason: 'already-preloaded' };
  }

  const config = readWorkspaceConfig(workspacePath);
  const specs = Array.isArray(config.specs) ? config.specs : [];
  if (specs.length > 0) {
    flagStore.set(PRELOADED_FLAG, true);
    return { seeded: false, reason: 'workspace-has-specs' };
  }

  const source = { ...PUBLIC_APIS_SPEC.source };
  const specPath = path.join(workspacePath, 'apispec', PUBLIC_APIS_SPEC.filename);
  const written = syncer.writeFromSnapshot({ specPath, source });
  if (!written) {
    // Snapshot missing from the build: leave the flag unset so a fixed build retries.
    return { seeded: false, reason: 'snapshot-unavailable' };
  }

  await addApiSpecToWorkspace(workspacePath, { name: PUBLIC_APIS_SPEC.name, path: specPath, source });
  flagStore.set(PRELOADED_FLAG, true);
  return { seeded: true, specPath, source };
};

module.exports = { seedPreloadedApiSpecs, PRELOADED_FLAG };
