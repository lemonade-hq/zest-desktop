/**
 * Zest: sync an API Spec file from its `source` (see api-spec-source.js).
 *
 * fetch source.url ─ OpenAPI 3.x ─▶ filter by includePaths ─▶ write (only if changed), contentFrom=url
 *        └─ unreachable / invalid ─▶ no file yet and source.fallback set ─▶ write filtered snapshot, contentFrom=snapshot
 *                                    file exists ─▶ keep it, record the error (spec shows as stale)
 */
const fs = require('fs');
const path = require('path');
const jsyaml = require('js-yaml');
const { filterOpenApiPaths } = require('@lemonade-hq/zest-core');

const parseSpecText = (text) => {
  if (text && typeof text === 'object') return text;
  if (typeof text !== 'string' || text.trim() === '') return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    try {
      return jsyaml.load(text);
    } catch (yamlErr) {
      return null;
    }
  }
};

const isOpenApi3 = (doc) => Boolean(doc && typeof doc === 'object' && typeof doc.openapi === 'string' && doc.openapi.startsWith('3.') && doc.paths && typeof doc.paths === 'object');

const serializeForFile = (doc, specPath) => {
  const ext = path.extname(specPath).toLowerCase();
  if (ext === '.yaml' || ext === '.yml') {
    return jsyaml.dump(doc, { noRefs: true, lineWidth: -1 });
  }
  return `${JSON.stringify(doc, null, 2)}\n`;
};

const describeError = (err) => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.response && err.response.status) return `HTTP ${err.response.status}`;
  return err.code || err.message || 'Unknown error';
};

const writeIfChanged = (specPath, content) => {
  const current = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf8') : null;
  if (current === content) return false;
  fs.mkdirSync(path.dirname(specPath), { recursive: true });
  fs.writeFileSync(specPath, content);
  return true;
};

/**
 * @param {object} deps
 * @param {(url: string) => Promise<string>} deps.fetchText  proxy-aware GET returning the body
 * @param {(id: string) => string|null} deps.readSnapshot  bundled snapshot text for a `fallback` id
 * @param {{ get, set }} deps.stateStore  see api-spec-sync-state.js
 * @param {() => Date} [deps.now]
 */
const createApiSpecSyncer = ({ fetchText, readSnapshot, stateStore, now = () => new Date() }) => {
  const writeFromSnapshot = ({ specPath, source, error = null }) => {
    const text = source && source.fallback ? readSnapshot(source.fallback) : null;
    const doc = parseSpecText(text);
    if (!isOpenApi3(doc)) {
      return null;
    }
    const changed = writeIfChanged(specPath, serializeForFile(filterOpenApiPaths(doc, source.includePaths), specPath));
    const previous = stateStore.get(specPath);
    const state = stateStore.set(specPath, {
      contentFrom: 'snapshot',
      lastAttemptAt: now().toISOString(),
      lastSuccessAt: previous ? previous.lastSuccessAt || null : null,
      error
    });
    return { ok: false, changed, state };
  };

  const syncApiSpec = async ({ specPath, source }) => {
    if (!source || !source.url) {
      throw new Error('This API spec has no source URL to sync from');
    }

    const attemptAt = now().toISOString();
    const previous = stateStore.get(specPath);
    let error;
    try {
      const doc = parseSpecText(await fetchText(source.url));
      if (isOpenApi3(doc)) {
        const changed = writeIfChanged(specPath, serializeForFile(filterOpenApiPaths(doc, source.includePaths), specPath));
        const state = stateStore.set(specPath, { contentFrom: 'url', lastAttemptAt: attemptAt, lastSuccessAt: attemptAt, error: null });
        return { ok: true, changed, state };
      }
      error = 'The source did not return an OpenAPI 3.x specification';
    } catch (err) {
      error = `Could not reach ${source.url} (${describeError(err)})`;
    }

    if (!fs.existsSync(specPath)) {
      const fromSnapshot = writeFromSnapshot({ specPath, source, error });
      if (fromSnapshot) return fromSnapshot;
    }

    const state = stateStore.set(specPath, {
      contentFrom: previous ? previous.contentFrom : 'url',
      lastAttemptAt: attemptAt,
      lastSuccessAt: previous ? previous.lastSuccessAt || null : null,
      error
    });
    return { ok: false, changed: false, state };
  };

  return { syncApiSpec, writeFromSnapshot };
};

module.exports = { createApiSpecSyncer, parseSpecText, isOpenApi3, serializeForFile };
