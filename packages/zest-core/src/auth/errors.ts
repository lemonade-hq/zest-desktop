import type { Environment } from '../environments';

/**
 * Typed errors for the credential and token path. Messages name the environment, partner or client
 * and the upstream status. They never carry a header, a request body, a secret or a token.
 */
export class NoActiveAuthClientError extends Error {
  constructor(env: Environment, partnerPublicId: string) {
    super(`Partner ${partnerPublicId} has no active auth_client credential in ${env}`);
    this.name = 'NoActiveAuthClientError';
  }
}

export class AuthClientNotFoundError extends Error {
  constructor(env: Environment, clientId: string) {
    super(`Auth client ${clientId} not found in auth-service (${env})`);
    this.name = 'AuthClientNotFoundError';
  }
}

/** `status` is null when the service answered, but not with a usable body, or did not answer at all. */
export class UpstreamError extends Error {
  readonly status: number | null;

  constructor(service: 'partners-service' | 'auth-service' | 'public-apis', env: Environment, status: number | null) {
    super(
      status === null
        ? `${service} (${env}) returned an unusable response`
        : `${service} (${env}) returned ${status}`
    );
    this.name = 'UpstreamError';
    this.status = status;
  }
}

export class AgentLoginFailedError extends Error {
  readonly status: number;

  constructor(env: Environment, status: number) {
    super(`Agent login failed in ${env}: ${status}`);
    this.name = 'AgentLoginFailedError';
    this.status = status;
  }
}
