import type { PartnerToken } from './types';

/** A cached token is reused only while it has more than this much life left. */
export const EXPIRY_SKEW_MS = 60_000;

/**
 * In-memory token cache keyed by `${env}:${partnerPublicId}`. A mint still in flight is shared, so
 * concurrent callers make one exchange. A failed mint is removed, so the next call retries.
 */
export class TokenCache {
  private readonly entries = new Map<string, Promise<PartnerToken>>();
  private readonly now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  async getOrMint(key: string, mint: () => Promise<PartnerToken>): Promise<PartnerToken> {
    const existing = this.entries.get(key);
    if (existing !== undefined) {
      const token = await existing.catch(() => undefined);
      if (token !== undefined && this.now().getTime() < token.expiresAt.getTime() - EXPIRY_SKEW_MS) {
        return token;
      }
    }

    const minting = mint();
    this.entries.set(key, minting);
    minting.catch(() => {
      if (this.entries.get(key) === minting) this.entries.delete(key);
    });
    return minting;
  }

  clear(): void {
    this.entries.clear();
  }
}
