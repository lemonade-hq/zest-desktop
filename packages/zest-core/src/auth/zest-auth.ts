import type { Environment } from '../environments';
import { AgentAuth } from './agent-auth';
import { PartnersServiceCredentialSource } from './partners-service';
import { TokenCache } from './token-cache';
import type { AuthLogger, HttpTransport, PartnerSummary, PartnerToken } from './types';

export interface ZestAuthDeps {
  readonly transport: HttpTransport;
  readonly now?: () => Date;
  readonly log?: AuthLogger;
}

const noopLogger: AuthLogger = () => {};

/**
 * The public face of zest-core's auth: the partner directory, the partner-token chain and the agent
 * login for any of the three environments. Partner lists are cached per environment for the
 * session; partner tokens are cached per `${env}:${publicId}` until 60 s before expiry; agent
 * tokens are never cached.
 */
export class ZestAuth {
  private readonly transport: HttpTransport;
  private readonly logger: AuthLogger;
  private readonly now: () => Date;
  private readonly tokenCache: TokenCache;
  private readonly partnerLists = new Map<Environment, Promise<PartnerSummary[]>>();

  constructor(deps: ZestAuthDeps) {
    this.transport = deps.transport;
    this.logger = deps.log ?? noopLogger;
    this.now = deps.now ?? (() => new Date());
    this.tokenCache = new TokenCache(this.now);
  }

  /** Paged GET {partnersService}/api/v3/partners, sorted by name, cached per env for the session. */
  listPartners(env: Environment): Promise<PartnerSummary[]> {
    const existing = this.partnerLists.get(env);
    if (existing !== undefined) return existing;

    const listing = this.sourceFor(env).listPartners();
    this.partnerLists.set(env, listing);
    listing.catch(() => {
      if (this.partnerLists.get(env) === listing) this.partnerLists.delete(env);
    });
    return listing;
  }

  /** The partner-token chain, cached per `${env}:${publicId}` until expiresAt − 60 s. */
  partnerToken(env: Environment, partnerPublicId: string): Promise<PartnerToken> {
    return this.tokenCache.getOrMint(`${env}:${partnerPublicId}`, () =>
      this.sourceFor(env).partnerToken(partnerPublicId)
    );
  }

  /** POST {publicApis}/v1/auth/agent/token with the partner token as bearer. Never cached. */
  agentToken(env: Environment, partnerToken: string, email: string, password: string): Promise<string> {
    return new AgentAuth(this.transport, this.logger).agentToken(env, partnerToken, email, password);
  }

  clearCache(): void {
    this.tokenCache.clear();
    this.partnerLists.clear();
  }

  private sourceFor(env: Environment): PartnersServiceCredentialSource {
    return new PartnersServiceCredentialSource(env, {
      transport: this.transport,
      logger: this.logger,
      now: this.now
    });
  }
}
