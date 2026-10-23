import { describe, expect, it } from '@jest/globals';
import { AgentAuth } from './agent-auth';
import { AgentLoginFailedError, UpstreamError } from './errors';
import { ACCESS_TOKEN, AGENT_PASSWORD, capturingLogger, jsonResult, scriptedTransport } from './test-support';

const LOGIN_URL = 'https://public-apis-sandbox.public.lmndsandbox.com/v1/auth/agent/token';
const AGENT_JWT = 'agent_jwt_ABC';

describe('AgentAuth.agentToken', () => {
  it('sends the partner token as a bearer and the credentials as JSON, then returns accessToken', async () => {
    const { transport, requests } = scriptedTransport(() => jsonResult({ accessToken: AGENT_JWT }));
    const { logger } = capturingLogger();

    const token = await new AgentAuth(transport, logger).agentToken(
      'sandbox',
      ACCESS_TOKEN,
      'agent@example.com',
      AGENT_PASSWORD
    );

    expect(token).toBe(AGENT_JWT);
    expect(requests.length).toBe(1);
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.url).toBe(LOGIN_URL);
    expect(requests[0]?.headers?.authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(JSON.parse(requests[0]?.body ?? '{}')).toEqual({ email: 'agent@example.com', password: AGENT_PASSWORD });
  });

  it('never caches: a second login makes a second request', async () => {
    const { transport, requests } = scriptedTransport(() => jsonResult({ accessToken: AGENT_JWT }));
    const auth = new AgentAuth(transport, capturingLogger().logger);

    await auth.agentToken('sandbox', ACCESS_TOKEN, 'a@x.com', AGENT_PASSWORD);
    await auth.agentToken('sandbox', ACCESS_TOKEN, 'a@x.com', AGENT_PASSWORD);

    expect(requests.length).toBe(2);
  });

  it('turns a 401 into AgentLoginFailedError with the status only', async () => {
    const { transport } = scriptedTransport(() => jsonResult({ message: 'Invalid email or password' }, 401));
    const auth = new AgentAuth(transport, capturingLogger().logger);

    const error = await auth.agentToken('production', ACCESS_TOKEN, 'a@x.com', AGENT_PASSWORD).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AgentLoginFailedError);
    expect((error as AgentLoginFailedError).message).toBe('Agent login failed in production: 401');
    expect((error as AgentLoginFailedError).status).toBe(401);
  });

  it('reports a network failure as an unusable response, with no status', async () => {
    const { transport } = scriptedTransport(() => {
      throw new Error('socket hang up');
    });
    const auth = new AgentAuth(transport, capturingLogger().logger);

    const error = await auth.agentToken('sandbox', ACCESS_TOKEN, 'a@x.com', AGENT_PASSWORD).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).status).toBeNull();
  });

  it('rejects a success response without accessToken', async () => {
    const { transport } = scriptedTransport(() => jsonResult({}));
    const auth = new AgentAuth(transport, capturingLogger().logger);

    await expect(auth.agentToken('sandbox', ACCESS_TOKEN, 'a@x.com', AGENT_PASSWORD)).rejects.toBeInstanceOf(
      UpstreamError
    );
  });

  it('rejects a success response that is not JSON at all', async () => {
    const { transport } = scriptedTransport(() => ({ status: 200, headers: {}, body: '<html>nope</html>' }));
    const auth = new AgentAuth(transport, capturingLogger().logger);

    await expect(auth.agentToken('sandbox', ACCESS_TOKEN, 'a@x.com', AGENT_PASSWORD)).rejects.toBeInstanceOf(
      UpstreamError
    );
  });
});
