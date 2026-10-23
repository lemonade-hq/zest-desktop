type Environment = 'staging' | 'sandbox' | 'production';
interface EnvironmentHosts {
    publicApis: string;
    authService: string;
    partnersService: string;
}
declare const ENVIRONMENTS: Record<Environment, EnvironmentHosts>;

interface PartnerSummary {
    publicId: string;
    name: string;
    code: string;
}
interface PartnerToken {
    accessToken: string;
    expiresAt: Date;
}
/**
 * The one way zest-core talks to other services. Consumers inject an implementation (in the
 * desktop app, backed by its own HTTP layer); tests inject a fake that records each request.
 * Keeping it injectable is what lets the tests assert the exact requests, including the form
 * body that carries the client secret. Request and response bodies are raw strings.
 */
interface HttpRequest {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
}
interface HttpResult {
    status: number;
    /** Response headers, lower-cased names. */
    headers: Record<string, string>;
    /** The raw body text. Never logged. */
    body: string;
}
type HttpTransport = (request: HttpRequest) => Promise<HttpResult>;
/** The logger signature ZestAuth accepts. Every `fields` object must go through `redact()` first. */
type AuthLogger = (level: 'info' | 'warn', message: string, fields: Record<string, unknown>) => void;

interface ZestAuthDeps {
    readonly transport: HttpTransport;
    readonly now?: () => Date;
    readonly log?: AuthLogger;
}
/**
 * The public face of zest-core's auth: the partner directory, the partner-token chain and the agent
 * login for any of the three environments. Partner lists are cached per environment for the
 * session; partner tokens are cached per `${env}:${publicId}` until 60 s before expiry; agent
 * tokens are never cached.
 */
declare class ZestAuth {
    private readonly transport;
    private readonly logger;
    private readonly now;
    private readonly tokenCache;
    private readonly partnerLists;
    constructor(deps: ZestAuthDeps);
    /** Paged GET {partnersService}/api/v3/partners, sorted by name, cached per env for the session. */
    listPartners(env: Environment): Promise<PartnerSummary[]>;
    /** The partner-token chain, cached per `${env}:${publicId}` until expiresAt − 60 s. */
    partnerToken(env: Environment, partnerPublicId: string): Promise<PartnerToken>;
    /** POST {publicApis}/v1/auth/agent/token with the partner token as bearer. Never cached. */
    agentToken(env: Environment, partnerToken: string, email: string, password: string): Promise<string>;
    clearCache(): void;
    private sourceFor;
}

/**
 * Typed errors for the credential and token path. Messages name the environment, partner or client
 * and the upstream status. They never carry a header, a request body, a secret or a token.
 */
declare class NoActiveAuthClientError extends Error {
    constructor(env: Environment, partnerPublicId: string);
}
declare class AuthClientNotFoundError extends Error {
    constructor(env: Environment, clientId: string);
}
/** `status` is null when the service answered, but not with a usable body, or did not answer at all. */
declare class UpstreamError extends Error {
    readonly status: number | null;
    constructor(service: 'partners-service' | 'auth-service' | 'public-apis', env: Environment, status: number | null);
}
declare class AgentLoginFailedError extends Error {
    readonly status: number;
    constructor(env: Environment, status: number);
}

export { AgentLoginFailedError, AuthClientNotFoundError, ENVIRONMENTS, Environment, EnvironmentHosts, HttpTransport, NoActiveAuthClientError, PartnerSummary, PartnerToken, UpstreamError, ZestAuth, ZestAuthDeps };
