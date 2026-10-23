import type { AuthLogger, HttpRequest, HttpResult, HttpTransport } from './types';

/** A transport that records every request and answers from `handler`. */
export function scriptedTransport(handler: (request: HttpRequest) => HttpResult | Promise<HttpResult>) {
  const requests: HttpRequest[] = [];
  const transport: HttpTransport = async (request) => {
    requests.push(request);
    return handler(request);
  };
  return { transport, requests };
}

export interface CapturedLine {
  readonly level: 'info' | 'warn';
  readonly message: string;
  readonly fields: Record<string, unknown>;
}

/** A logger that keeps every line, so tests can search what was written. */
export function capturingLogger() {
  const lines: CapturedLine[] = [];
  const logger: AuthLogger = (level, message, fields) => lines.push({ level, message, fields });
  return { logger, lines };
}

/** A fixed, controllable clock for expiry tests. */
export function fakeClock(startIso: string) {
  let current = new Date(startIso).getTime();
  return {
    now: () => new Date(current),
    advanceMs: (ms: number) => {
      current += ms;
    }
  };
}

export const PARTNER_ID = 'partner_acme';
export const CLIENT_ID = 'client_acme_live';
export const CLIENT_SECRET = 'cs_SECRET_do_not_leak_9f3a';
export const ACCESS_TOKEN = 'at_PARTNER_TOKEN_77bc';
export const AGENT_PASSWORD = 'pw_AGENT_hunter2';

/** Wraps a canned payload in an HttpResult the way the live services answer. */
export const jsonResult = (body: unknown, status = 200): HttpResult => ({
  status,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body)
});

/** Canned response bodies for the four-step chain, shaped like the live services. */
export const partnersPage = (
  partners: { publicId: string; name: string; code: string; status?: string }[],
  totalPages = 1
) => ({
  data: partners,
  stats: { totalPages }
});
export const credentialsBody = (credentials: { type: string; name: string; active?: boolean | null }[]) => ({
  data: { credentials }
});
export const authClientBody = { data: { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET } };
export const tokenBody = { access_token: ACCESS_TOKEN, expires_in: 3600 };

export const activeAuthClient = [{ type: 'auth_client', name: CLIENT_ID, active: true }];

/** Routes the four-step chain for any environment. */
export function chainHandler(overrides: { credentials?: unknown; client?: HttpResult; token?: HttpResult } = {}) {
  return (request: HttpRequest): HttpResult => {
    if (request.url.includes('/distributions/api/credentials')) {
      return jsonResult(overrides.credentials ?? credentialsBody(activeAuthClient));
    }
    if (request.url.includes('/api/v1/clients/')) {
      return overrides.client ?? jsonResult(authClientBody);
    }
    if (request.url.endsWith('/oauth-partners/token')) {
      return overrides.token ?? jsonResult(tokenBody);
    }
    return { status: 500, headers: {}, body: '' };
  };
}
