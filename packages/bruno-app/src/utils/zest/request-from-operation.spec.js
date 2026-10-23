// jest.setup.js stubs nanoid without customAlphabet, which the OpenAPI converter uses for uids.
jest.mock('nanoid', () => {
  let n = 0;
  return { nanoid: () => `id${++n}`, customAlphabet: () => () => String(++n).padStart(21, 'u') };
});

import fs from 'fs';
import path from 'path';
import { buildRequestFromOperation, defaultAuthMode, LEMONADE_AUTH_MODES_ENABLED } from './request-from-operation';

const snapshot = JSON.parse(fs.readFileSync(
  path.resolve(process.cwd(), '../bruno-electron/resources/data/zest/public-apis-openapi.json'),
  'utf8'
));
const lemonadeSource = { url: 'https://public-apis-master.lmndstaging.com/api-json', baseUrlVariable: 'publicApis', authPreset: 'lemonade' };

describe('defaultAuthMode', () => {
  it('is inherit while the lemonade-* auth modes are not merged', () => {
    expect(LEMONADE_AUTH_MODES_ENABLED).toBe(false);
    expect(defaultAuthMode(lemonadeSource)).toBe('inherit');
  });

  it('is lemonade-partner once the auth modes are enabled', () => {
    expect(defaultAuthMode(lemonadeSource, { lemonadeAuthModesEnabled: true })).toBe('lemonade-partner');
  });

  it('leaves auth to the converter for specs without the Lemonade preset', () => {
    expect(defaultAuthMode({ url: 'https://example.com/openapi.json' }, { lemonadeAuthModesEnabled: true })).toBeNull();
    expect(defaultAuthMode(undefined)).toBeNull();
  });
});

describe('buildRequestFromOperation', () => {
  it('builds POST /api/v3/us/car/applications from the public-apis spec', () => {
    const request = buildRequestFromOperation({
      spec: snapshot,
      method: 'post',
      path: '/api/v3/us/car/applications',
      source: lemonadeSource
    });

    expect(request.method).toBe('POST');
    expect(request.url).toBe('{{publicApis}}/api/v3/us/car/applications');
    expect(request.auth).toEqual({ mode: 'inherit' });
    expect(request.body.mode).toBe('json');
    expect(JSON.parse(request.body.json)).toEqual(expect.any(Object));
    expect(request.name).toBeTruthy();
  });

  it('uses lemonade-partner when the switch is on', () => {
    const request = buildRequestFromOperation({
      spec: snapshot, method: 'post', path: '/api/v3/us/car/applications', source: lemonadeSource, lemonadeAuthModesEnabled: true
    });
    expect(request.auth).toEqual({ mode: 'lemonade-partner' });
  });

  it('keeps {{baseUrl}} and the converter auth for a plain spec', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Pets', version: '1' },
      components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
      paths: {
        '/pets/{id}': {
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          get: { operationId: 'getPet', security: [{ bearer: [] }], responses: { 200: { description: 'ok' } } },
          delete: { operationId: 'deletePet', responses: { 204: { description: 'gone' } } }
        }
      }
    };
    const request = buildRequestFromOperation({ spec, method: 'GET', path: '/pets/{id}' });
    expect(request.method).toBe('GET');
    expect(request.url).toBe('{{baseUrl}}/pets/:id');
    expect(request.auth.mode).toBe('bearer');
    expect(request.params).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'id', type: 'path' })]));
  });

  it('throws for an operation the spec does not have', () => {
    expect(() => buildRequestFromOperation({ spec: snapshot, method: 'post', path: '/api/v3/us/car/quotes' }))
      .toThrow('not found');
  });
});

describe('uniqueTransientRequestName', () => {
  const { uniqueTransientRequestName } = require('./request-from-operation');
  it('appends a counter when an unsaved request already has the name', () => {
    const collection = { items: [{ type: 'http-request', name: 'Create application', isTransient: true, request: {} }] };
    expect(uniqueTransientRequestName(collection, 'Create application')).toBe('Create application 2');
    expect(uniqueTransientRequestName({ items: [] }, 'Create application')).toBe('Create application');
  });
});
