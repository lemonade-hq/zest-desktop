export interface PartnerSummary {
  publicId: string;
  name: string;
  code: string;
}

export interface PartnerToken {
  accessToken: string;
  expiresAt: Date;
}

/**
 * Where partner identities and partner tokens come from for one environment. The
 * implementation calls the live partners-service and auth-service of that stage.
 */
export interface CredentialSource {
  listPartners(): Promise<PartnerSummary[]>;
  partnerToken(partnerPublicId: string): Promise<PartnerToken>;
}

/**
 * The one way zest-core talks to other services. Consumers inject an implementation (in the
 * desktop app, backed by its own HTTP layer); tests inject a fake that records each request.
 * Keeping it injectable is what lets the tests assert the exact requests, including the form
 * body that carries the client secret. Request and response bodies are raw strings.
 */
export interface HttpRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface HttpResult {
  status: number;
  /** Response headers, lower-cased names. */
  headers: Record<string, string>;
  /** The raw body text. Never logged. */
  body: string;
}

export type HttpTransport = (request: HttpRequest) => Promise<HttpResult>;

/** The logger signature ZestAuth accepts. Every `fields` object must go through `redact()` first. */
export type AuthLogger = (level: 'info' | 'warn', message: string, fields: Record<string, unknown>) => void;

/** JSON.parse that reports an unparsable body as undefined instead of throwing. */
export function parseJsonBody(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
