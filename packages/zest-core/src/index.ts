export { ENVIRONMENTS } from './environments';
export type { Environment, EnvironmentHosts } from './environments';

// auth
export type { PartnerSummary, PartnerToken, HttpTransport } from './auth/types';
export { ZestAuth } from './auth/zest-auth';
export type { ZestAuthDeps } from './auth/zest-auth';
export {
  AgentLoginFailedError,
  AuthClientNotFoundError,
  NoActiveAuthClientError,
  UpstreamError
} from './auth/errors';

// api specs
export { filterOpenApiPaths, globToRegExp, matchesAnyGlob, PUBLIC_APIS_SPEC, PUBLIC_APIS_SNAPSHOT_ID } from './api-specs';
export type { ApiSpecSource } from './api-specs';
