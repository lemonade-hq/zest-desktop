import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from '@jest/globals';
import { filterOpenApiPaths, matchesAnyGlob } from './path-filter';
import { PUBLIC_APIS_SPEC } from './presets';

const snapshotPath = path.resolve(__dirname, '../../../bruno-electron/resources/data/zest/public-apis-openapi.json');

describe('matchesAnyGlob', () => {
  it.each([
    ['/api/v3/us/car/applications', true],
    ['/api/v3/fr/renters/quotes/{quoteId}', true],
    ['/api/v3', false],
    ['/api/v2/us/pet/quotes', false],
    ['/v1/auth/agent/token', false],
    ['/api/v30/x', false]
  ])('%s against /api/v3/** -> %s', (value, expected) => {
    expect(matchesAnyGlob(value, ['/api/v3/**'])).toBe(expected);
  });

  it('keeps * inside one segment', () => {
    expect(matchesAnyGlob('/api/v3/us', ['/api/v3/*'])).toBe(true);
    expect(matchesAnyGlob('/api/v3/us/car', ['/api/v3/*'])).toBe(false);
  });

  it('treats regex characters literally', () => {
    expect(matchesAnyGlob('/a.b', ['/a.b'])).toBe(true);
    expect(matchesAnyGlob('/axb', ['/a.b'])).toBe(false);
  });

  it('matches any of several globs', () => {
    expect(matchesAnyGlob('/api/v2/x', ['/api/v3/**', '/api/v2/**'])).toBe(true);
  });
});

describe('filterOpenApiPaths', () => {
  const doc = {
    openapi: '3.0.0',
    info: { title: 't', version: '1' },
    tags: [{ name: 'car' }, { name: 'pet' }, { name: 'unused' }],
    paths: {
      '/api/v3/us/car/applications': { post: { tags: ['car'], responses: {} } },
      '/api/v2/us/pet/quotes': { post: { tags: ['pet'], responses: {} } }
    },
    components: { schemas: { A: { type: 'object' } } }
  };

  it('keeps only matching paths and their tags, leaving components whole', () => {
    const filtered = filterOpenApiPaths(doc, ['/api/v3/**']);
    expect(Object.keys(filtered.paths!)).toEqual(['/api/v3/us/car/applications']);
    expect(filtered.tags).toEqual([{ name: 'car' }]);
    expect(filtered.components).toBe(doc.components);
  });

  it('does not mutate the input', () => {
    filterOpenApiPaths(doc, ['/api/v3/**']);
    expect(Object.keys(doc.paths)).toHaveLength(2);
  });

  it('keeps everything when includePaths is empty or missing', () => {
    expect(filterOpenApiPaths(doc, [])).toBe(doc);
    expect(filterOpenApiPaths(doc, undefined)).toBe(doc);
  });

  it('reduces the bundled public-apis snapshot to its 34 v3 paths', () => {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    const filtered = filterOpenApiPaths(snapshot, PUBLIC_APIS_SPEC.source.includePaths);
    const paths = Object.keys(filtered.paths);
    expect(paths).toHaveLength(34);
    expect(paths.every((p) => p.startsWith('/api/v3/'))).toBe(true);
    expect(paths).toContain('/api/v3/us/car/applications');
  });
});

describe('PUBLIC_APIS_SPEC', () => {
  it('points at the staging public-apis api-json with publicApis as base URL variable', () => {
    expect(PUBLIC_APIS_SPEC.name).toBe('Lemonade public-apis');
    expect(PUBLIC_APIS_SPEC.source.url).toBe('https://public-apis-master.lmndstaging.com/api-json');
    expect(PUBLIC_APIS_SPEC.source.baseUrlVariable).toBe('publicApis');
  });
});
