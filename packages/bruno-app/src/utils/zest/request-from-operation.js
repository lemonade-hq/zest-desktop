/**
 * Zest: turn one OpenAPI operation of an API Spec into a Bruno request.
 *
 * Bruno's own OpenAPI converter does the work (example body, params, headers), run on a one-operation
 * copy of the spec. The spec's `source` block (workspace.yml) then adjusts it:
 * - `baseUrlVariable` replaces `{{baseUrl}}`, e.g. `{{publicApis}}/api/v3/us/car/applications`;
 * - `authPreset: 'lemonade'` sets the Lemonade auth default.
 */
import { openApiToBruno } from '@usebruno/converters';
import { flattenItems, isItemTransientRequest } from 'utils/collections';

// TODO(lemonade-partner auth mode, task 23295e72 "Add the `lemonade-partner` auth mode to Zest Desktop"):
// flip to true once the mode is merged, so requests from the Lemonade spec default to `lemonade-partner`.
export const LEMONADE_AUTH_MODES_ENABLED = false;

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/**
 * Auth mode for a request created from a spec with this source, or null to keep the converter's auth.
 * Every public-apis operation is called as a partner (the spec has one `bearer` scheme and no
 * per-operation security), so there is no agent detection here.
 */
export const defaultAuthMode = (source, { lemonadeAuthModesEnabled = LEMONADE_AUTH_MODES_ENABLED } = {}) => {
  if (source?.authPreset !== 'lemonade') return null;
  return lemonadeAuthModesEnabled ? 'lemonade-partner' : 'inherit';
};

const findFirstRequest = (items = []) => {
  for (const item of items) {
    if (item.type === 'http-request') return item;
    const nested = findFirstRequest(item.items);
    if (nested) return nested;
  }
  return null;
};

const replaceBaseUrl = (url, baseUrlVariable) => {
  if (!baseUrlVariable || typeof url !== 'string') return url;
  return url.startsWith('{{baseUrl}}') ? `{{${baseUrlVariable}}}${url.slice('{{baseUrl}}'.length)}` : url;
};

/**
 * @param {object} args
 * @param {object} args.spec     parsed (resolved) OpenAPI document
 * @param {string} args.method   e.g. 'post'
 * @param {string} args.path     e.g. '/api/v3/us/car/applications'
 * @param {object} [args.source] the spec's source block
 * @returns {{ name, method, url, headers, params, body, auth, docs }}
 */
export const buildRequestFromOperation = ({ spec, method, path, source, lemonadeAuthModesEnabled } = {}) => {
  const lowerMethod = String(method || '').toLowerCase();
  const pathItem = spec?.paths?.[path];
  const operation = pathItem?.[lowerMethod];
  if (!HTTP_METHODS.includes(lowerMethod) || !operation) {
    throw new Error(`Operation ${String(method).toUpperCase()} ${path} not found in the spec`);
  }

  // Keep path-level parameters, drop the other operations of this path.
  const singlePathItem = { [lowerMethod]: operation };
  if (pathItem.parameters) singlePathItem.parameters = pathItem.parameters;
  if (pathItem.servers) singlePathItem.servers = pathItem.servers;

  const collection = openApiToBruno({ ...spec, paths: { [path]: singlePathItem } }, { groupBy: 'path' });
  const item = findFirstRequest(collection?.items);
  if (!item) {
    throw new Error(`Could not build a request for ${lowerMethod.toUpperCase()} ${path}`);
  }

  const { request } = item;
  const authMode = defaultAuthMode(source, { lemonadeAuthModesEnabled });
  const auth = authMode ? { mode: authMode } : request.auth;

  return {
    name: item.name,
    method: request.method,
    url: replaceBaseUrl(request.url, source?.baseUrlVariable),
    headers: request.headers || [],
    params: request.params || [],
    body: request.body,
    auth,
    docs: request.docs || ''
  };
};

/** First free transient request name: "Create application", "Create application 2", … */
export const uniqueTransientRequestName = (collection, baseName) => {
  const taken = new Set(
    flattenItems(collection?.items || [])
      .filter(isItemTransientRequest)
      .flatMap((item) => [item.name, (item.filename || '').replace(/\.[^.]+$/, '')])
      .map((name) => (name || '').trim().toLowerCase())
  );
  let name = baseName;
  for (let counter = 2; taken.has(name.toLowerCase()); counter += 1) {
    name = `${baseName} ${counter}`;
  }
  return name;
};
