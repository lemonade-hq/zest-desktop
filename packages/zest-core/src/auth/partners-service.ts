import { Type, type Static, type TSchema } from 'typebox';
import { Value } from 'typebox/value';
import { ENVIRONMENTS, type Environment } from '../environments';
import { AuthClientNotFoundError, NoActiveAuthClientError, UpstreamError } from './errors';
import { redact } from './redact';
import {
  parseJsonBody,
  type AuthLogger,
  type CredentialSource,
  type HttpRequest,
  type HttpResult,
  type HttpTransport,
  type PartnerSummary,
  type PartnerToken
} from './types';

type Service = 'partners-service' | 'auth-service';

/** Shapes copied from partners-platform apps/api-docs/src/clients/{partners,auth}.client.ts. */
const PartnersPage = Type.Object({
  data: Type.Array(Type.Object({ publicId: Type.String(), name: Type.String(), code: Type.String() })),
  stats: Type.Object({ totalPages: Type.Number() })
});

const CredentialsPayload = Type.Object({
  data: Type.Object({
    credentials: Type.Array(
      Type.Object({
        type: Type.String(),
        name: Type.String(),
        active: Type.Optional(Type.Union([Type.Boolean(), Type.Null()]))
      })
    )
  })
});

const AuthClientPayload = Type.Object({
  data: Type.Object({ clientId: Type.String({ minLength: 1 }), clientSecret: Type.String({ minLength: 1 }) })
});

const TokenResponse = Type.Object({ access_token: Type.String({ minLength: 1 }), expires_in: Type.Number() });

const PAGE_SIZE = 100;

export interface PartnersServiceDeps {
  readonly transport: HttpTransport;
  readonly logger: AuthLogger;
  readonly now: () => Date;
}

/**
 * Lists partners and mints partner tokens from the live partners-service and auth-service, using the
 * chain api-docs uses. The client secret is a local constant inside `partnerToken()`. It is never
 * stored, logged or returned.
 */
export class PartnersServiceCredentialSource implements CredentialSource {
  private readonly env: Environment;
  private readonly deps: PartnersServiceDeps;

  constructor(env: Environment, deps: PartnersServiceDeps) {
    this.env = env;
    this.deps = deps;
  }

  async listPartners(): Promise<PartnerSummary[]> {
    const partnersService = ENVIRONMENTS[this.env].partnersService;
    const partners: PartnerSummary[] = [];
    for (let page = 1; ; page++) {
      const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      const body = await this.getJson('partners-service', `${partnersService}/api/v3/partners?${query}`, PartnersPage);
      for (const partner of body.data) {
        partners.push({ publicId: partner.publicId, name: partner.name, code: partner.code });
      }
      if (body.data.length === 0 || page >= body.stats.totalPages) break;
    }
    return partners.sort((a, b) => a.name.localeCompare(b.name));
  }

  async partnerToken(partnerPublicId: string): Promise<PartnerToken> {
    const { partnersService, authService } = ENVIRONMENTS[this.env];

    // Step 2: the partner's auth_client credential. Its `name` is the auth-service client id.
    const credentials = await this.getJson(
      'partners-service',
      `${partnersService}/api/v3/partners/${encodeURIComponent(partnerPublicId)}/distributions/api/credentials`,
      CredentialsPayload
    );
    const authClient = credentials.data.credentials.find((c) => c.type === 'auth_client' && c.active === true);
    if (authClient === undefined) {
      this.deps.logger('warn', 'auth: no active auth_client credential', redact({ env: this.env, partnerPublicId }));
      throw new NoActiveAuthClientError(this.env, partnerPublicId);
    }

    // Step 3: the client id and secret. The secret is used once, in step 4, and then goes out of scope.
    const client = await this.getClient(authService, authClient.name);
    const token = await this.exchange(authService, client.clientId, client.clientSecret);
    this.deps.logger(
      'info',
      'auth: minted partner token',
      redact({ env: this.env, partnerPublicId, clientId: client.clientId, expiresAt: token.expiresAt.toISOString() })
    );
    return token;
  }

  private async getClient(authService: string, clientId: string): Promise<Static<typeof AuthClientPayload>['data']> {
    const url = `${authService}/api/v1/clients/${encodeURIComponent(clientId)}`;
    const result = await this.send('auth-service', { method: 'GET', url }, { allowNotFound: true });
    if (result.status === 404) {
      this.deps.logger('warn', 'auth: auth client not found', redact({ env: this.env, clientId }));
      throw new AuthClientNotFoundError(this.env, clientId);
    }
    return this.parse('auth-service', result, AuthClientPayload).data;
  }

  /** Step 4. The form body holds the secret, so the request itself is never logged. */
  private async exchange(authService: string, clientId: string, clientSecret: string): Promise<PartnerToken> {
    const form = new URLSearchParams({
      grant_type: 'client_credentials',
      response_type: 'token',
      client_id: clientId,
      client_secret: clientSecret
    });
    const result = await this.send('auth-service', {
      method: 'POST',
      url: `${authService}/oauth-partners/token`,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const token = this.parse('auth-service', result, TokenResponse);
    return {
      accessToken: token.access_token,
      expiresAt: new Date(this.deps.now().getTime() + token.expires_in * 1000)
    };
  }

  private async getJson<T extends TSchema>(service: Service, url: string, schema: T): Promise<Static<T>> {
    return this.parse(service, await this.send(service, { method: 'GET', url }), schema);
  }

  /** Non-2xx becomes UpstreamError with the status. A transport failure becomes one with null. */
  private async send(
    service: Service,
    request: HttpRequest,
    options: { allowNotFound?: boolean } = {}
  ): Promise<HttpResult> {
    let result: HttpResult;
    try {
      result = await this.deps.transport(request);
    } catch {
      this.deps.logger('warn', 'auth: upstream unreachable', redact({ env: this.env, service }));
      throw new UpstreamError(service, this.env, null);
    }
    if (result.status >= 200 && result.status < 300) return result;
    if (options.allowNotFound === true && result.status === 404) return result;
    this.deps.logger('warn', 'auth: upstream request failed', redact({ env: this.env, service, status: result.status }));
    throw new UpstreamError(service, this.env, result.status);
  }

  /** The transport returns a raw string body: parse it, then check the shape. Either failing is an unusable response. */
  private parse<T extends TSchema>(service: Service, result: HttpResult, schema: T): Static<T> {
    const body = parseJsonBody(result.body);
    if (body === undefined || !Value.Check(schema, body)) {
      this.deps.logger('warn', 'auth: upstream body unexpected', redact({ env: this.env, service }));
      throw new UpstreamError(service, this.env, null);
    }
    return body;
  }
}
