const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApiSpecSyncer } = require('../../src/zest/api-spec-sync');
const { createSyncStateStore, isStale } = require('../../src/zest/api-spec-sync-state');

const SNAPSHOT_PATH = path.join(__dirname, '../../resources/data/zest/public-apis-openapi.json');
const snapshotText = fs.readFileSync(SNAPSHOT_PATH, 'utf8');

const source = {
  url: 'https://public-apis-master.lmndstaging.com/api-json',
  includePaths: ['/api/v3/**'],
  fallback: 'bundled:public-apis'
};

const liveSpec = {
  openapi: '3.0.0',
  info: { title: 'live', version: '2' },
  paths: {
    '/api/v3/us/car/applications': { post: { responses: {} } },
    '/api/v2/us/pet/quotes': { post: { responses: {} } }
  }
};

describe('createApiSpecSyncer', () => {
  let dir;
  let specPath;
  let stateStore;
  const makeSyncer = (fetchText) => createApiSpecSyncer({
    fetchText,
    readSnapshot: (id) => (id === 'bundled:public-apis' ? snapshotText : null),
    stateStore,
    now: () => new Date('2025-10-23T12:00:00Z')
  });
  const readSpec = () => JSON.parse(fs.readFileSync(specPath, 'utf8'));

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zest-sync-'));
    specPath = path.join(dir, 'apispec', 'Lemonade public-apis.json');
    stateStore = createSyncStateStore(() => dir);
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('writes the fetched spec filtered to the include paths', async () => {
    const result = await makeSyncer(async () => JSON.stringify(liveSpec)).syncApiSpec({ specPath, source });

    expect(result).toMatchObject({ ok: true, changed: true });
    expect(Object.keys(readSpec().paths)).toEqual(['/api/v3/us/car/applications']);
    expect(stateStore.get(specPath)).toMatchObject({ contentFrom: 'url', error: null });
    expect(isStale(stateStore.get(specPath))).toBe(false);
  });

  it('does not rewrite the file when nothing changed', async () => {
    const syncer = makeSyncer(async () => JSON.stringify(liveSpec));
    await syncer.syncApiSpec({ specPath, source });
    const second = await syncer.syncApiSpec({ specPath, source });
    expect(second.changed).toBe(false);
  });

  it('falls back to the bundled snapshot when unreachable and no copy exists', async () => {
    const err = Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' });
    const result = await makeSyncer(async () => { throw err; }).syncApiSpec({ specPath, source });

    expect(result.ok).toBe(false);
    const paths = Object.keys(readSpec().paths);
    expect(paths).toHaveLength(34);
    expect(paths.every((p) => p.startsWith('/api/v3/'))).toBe(true);
    expect(stateStore.get(specPath)).toMatchObject({ contentFrom: 'snapshot', error: expect.stringContaining('ENOTFOUND') });
    expect(isStale(stateStore.get(specPath))).toBe(true);
  });

  it('keeps a previously fetched copy rather than the older snapshot when unreachable', async () => {
    await makeSyncer(async () => JSON.stringify(liveSpec)).syncApiSpec({ specPath, source });
    const result = await makeSyncer(async () => { throw new Error('offline'); }).syncApiSpec({ specPath, source });

    expect(result).toMatchObject({ ok: false, changed: false });
    expect(readSpec().info.title).toBe('live');
    expect(stateStore.get(specPath)).toMatchObject({ contentFrom: 'url', error: expect.stringContaining('offline') });
    expect(isStale(stateStore.get(specPath))).toBe(true);
  });

  it('treats a non-OpenAPI response as a failed sync', async () => {
    const result = await makeSyncer(async () => '<html>login</html>').syncApiSpec({ specPath, source });
    expect(result.ok).toBe(false);
    expect(stateStore.get(specPath)).toMatchObject({ contentFrom: 'snapshot', error: expect.stringContaining('OpenAPI 3.x') });
  });

  it('clears the stale flag once the URL is reachable again', async () => {
    await makeSyncer(async () => { throw new Error('offline'); }).syncApiSpec({ specPath, source });
    await makeSyncer(async () => JSON.stringify(liveSpec)).syncApiSpec({ specPath, source });
    expect(isStale(stateStore.get(specPath))).toBe(false);
    expect(readSpec().info.title).toBe('live');
  });

  it('keeps every path when the source has no include paths', async () => {
    await makeSyncer(async () => JSON.stringify(liveSpec)).syncApiSpec({ specPath, source: { url: source.url } });
    expect(Object.keys(readSpec().paths)).toHaveLength(2);
  });

  it('rejects a spec without a source URL', async () => {
    await expect(makeSyncer(async () => '').syncApiSpec({ specPath, source: {} })).rejects.toThrow('no source URL');
  });
});
