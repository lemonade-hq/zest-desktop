import { Type } from 'typebox';
import { Value } from 'typebox/value';
import { ENVIRONMENTS, type Environment } from '../environments';
import { AgentLoginFailedError, UpstreamError } from './errors';
import { redact } from './redact';
import { parseJsonBody, type AuthLogger, type HttpResult, type HttpTransport } from './types';
const AgentTokenResponse = Type.Object({ accessToken: Type.String({ minLength: 1 }) });

/**
 * Logs an insurance agent in through public-apis, with a partner token as the bearer. Agent tokens
 * are not cached. The password is sent once and never logged.
 */
export class AgentAuth {
  private readonly transport: HttpTransport;
  private readonly logger: AuthLogger;

  constructor(transport: HttpTransport, logger: AuthLogger) {
    this.transport = transport;
    this.logger = logger;
  }

  async agentToken(env: Environment, partnerToken: string, email: string, password: string): Promise<string> {
    const url = `${ENVIRONMENTS[env].publicApis}/v1/auth/agent/token`;
    let result: HttpResult;
    try {
      result = await this.transport({
        method: 'POST',
        url,
        headers: { 'authorization': `Bearer ${partnerToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } catch {
      throw new UpstreamError('public-apis', env, null);
    }
    if (result.status < 200 || result.status >= 300) {
      this.logger('warn', 'auth: agent login failed', redact({ env, status: result.status }));
      throw new AgentLoginFailedError(env, result.status);
    }
    const body = parseJsonBody(result.body);
    if (body === undefined || !Value.Check(AgentTokenResponse, body)) {
      throw new UpstreamError('public-apis', env, null);
    }
    this.logger('info', 'auth: agent logged in', redact({ env }));
    return body.accessToken;
  }
}
