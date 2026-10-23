/**
 * Zest: Lemonade auth. Holds the one ZestAuth instance (its caches live for the app session) and
 * serves the partner list to the renderer. The HTTP layer is Bruno's axios instance, so the app's
 * proxy and CA settings apply.
 */
const { ipcMain } = require('electron');
const { ZestAuth } = require('@lemonade-hq/zest-core');
const { getCertsAndProxyConfig } = require('./network/cert-utils');
const { makeAxiosInstance } = require('./network/axios-instance');
const { listPartners } = require('../zest/partner-auth');

const REQUEST_TIMEOUT_MS = 15000;

/** zest-core HttpTransport. Resolves for any HTTP status; rejects only when the service did not answer. */
const transport = async ({ method, url, headers, body }) => {
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
  const response = await axiosInstance({
    method,
    url,
    headers,
    data: body,
    timeout: REQUEST_TIMEOUT_MS,
    responseType: 'text',
    transformResponse: [(data) => data],
    validateStatus: () => true
  });
  const responseHeaders = {};
  for (const [name, value] of Object.entries(response.headers || {})) {
    responseHeaders[name.toLowerCase()] = String(value);
  }
  return {
    status: response.status,
    headers: responseHeaders,
    body: typeof response.data === 'string' ? response.data : String(response.data ?? '')
  };
};

let zestAuth = null;
const getZestAuth = () => {
  if (!zestAuth) zestAuth = new ZestAuth({ transport });
  return zestAuth;
};

const registerZestIpc = () => {
  ipcMain.handle('renderer:zest-list-partners', (_event, env) => listPartners(getZestAuth(), env));
};

module.exports = registerZestIpc;
module.exports.getZestAuth = getZestAuth;
