import { describe, expect, it } from '@jest/globals';
import {
  ACCESS_TOKEN,
  AGENT_PASSWORD,
  CLIENT_SECRET,
  PARTNER_ID,
  capturingLogger,
  chainHandler,
  fakeClock,
  jsonResult,
  scriptedTransport
} from './test-support';
import { ZestAuth } from './zest-auth';

/**
 * Runs the happy path, each failure path and the agent login with secrets in play, then searches
 * everything that was logged, and every error message, for any secret value.
 */
describe('log redaction', () => {
  it('no log line or error message carries a secret, a token, a password or a bearer header', async () => {
    const { logger, lines } = capturingLogger();
    const clock = fakeClock('2026-05-01T12:00:00.000Z');
    const errors: string[] = [];
    const secrets = [CLIENT_SECRET, ACCESS_TOKEN, AGENT_PASSWORD, 'Bearer '];

    const flows = [
      // happy path
      async () => {
        const { transport } = scriptedTransport(chainHandler());
        const auth = new ZestAuth({ transport, now: clock.now, log: logger });
        return auth.partnerToken('sandbox', PARTNER_ID);
      },
      // auth-service 404
      async () => {
        const { transport } = scriptedTransport(chainHandler({ client: { status: 404, headers: {}, body: '' } }));
        const auth = new ZestAuth({ transport, now: clock.now, log: logger });
        return auth.partnerToken('sandbox', PARTNER_ID);
      },
      // token endpoint 500 with a body that echoes the secret
      async () => {
        const { transport } = scriptedTransport(
          chainHandler({ token: jsonResult({ error: `bad client_secret=${CLIENT_SECRET}` }, 500) })
        );
        const auth = new ZestAuth({ transport, now: clock.now, log: logger });
        return auth.partnerToken('sandbox', PARTNER_ID);
      },
      // agent login failure, password in the request and echoed in the response body
      async () => {
        const { transport } = scriptedTransport(() => jsonResult({ message: AGENT_PASSWORD }, 401));
        const auth = new ZestAuth({ transport, now: clock.now, log: logger });
        return auth.agentToken('production', ACCESS_TOKEN, 'a@x.com', AGENT_PASSWORD);
      }
    ];

    for (const flow of flows) {
      try {
        await flow();
      } catch (error) {
        errors.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      }
    }

    const haystack = JSON.stringify(lines) + '\n' + errors.join('\n');
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(errors.length).toBe(3);
    for (const secret of secrets) {
      expect({ secret, leaked: haystack.includes(secret) }).toEqual({ secret, leaked: false });
    }
  });
});
