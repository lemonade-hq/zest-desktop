/**
 * Zest: runtime sync state of API Specs (not shareable config), kept in
 * `<userData>/zest-api-spec-sync.json`, keyed by the spec's absolute path.
 *
 *   { "/…/apispec/Lemonade public-apis.json": {
 *       "contentFrom": "url" | "snapshot", "lastAttemptAt": "…", "lastSuccessAt": "…" | null, "error": "…" | null } }
 */
const fs = require('fs');
const path = require('path');

const STATE_FILENAME = 'zest-api-spec-sync.json';

const keyFor = (specPath) => path.normalize(specPath);

const createSyncStateStore = (getDir) => {
  const filePath = () => path.join(getDir(), STATE_FILENAME);

  const readAll = () => {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath(), 'utf8'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
      return {};
    }
  };

  const writeAll = (all) => {
    fs.mkdirSync(path.dirname(filePath()), { recursive: true });
    fs.writeFileSync(filePath(), JSON.stringify(all, null, 2));
  };

  return {
    get: (specPath) => readAll()[keyFor(specPath)] || null,
    set: (specPath, state) => {
      const all = readAll();
      all[keyFor(specPath)] = state;
      writeAll(all);
      return state;
    },
    remove: (specPath) => {
      const all = readAll();
      if (all[keyFor(specPath)]) {
        delete all[keyFor(specPath)];
        writeAll(all);
      }
    }
  };
};

/** A spec is stale when its content is the bundled snapshot or its last sync failed. */
const isStale = (state) => Boolean(state && (state.contentFrom === 'snapshot' || state.error));

module.exports = { createSyncStateStore, isStale, STATE_FILENAME };
