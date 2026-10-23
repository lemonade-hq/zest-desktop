import { ENVIRONMENTS } from '../environments';

/** Where an API Spec is synced from, stored next to the spec's entry in workspace.yml. */
export interface ApiSpecSource {
  url?: string;
  /** Globs over OpenAPI paths to keep. Missing or empty keeps every path. */
  includePaths?: string[];
  /** Variable that replaces `{{baseUrl}}` in requests created from an operation. */
  baseUrlVariable?: string;
  /** `lemonade` applies the Lemonade auth default to requests created from an operation. */
  authPreset?: 'lemonade';
  /** Bundled snapshot used when `url` is unreachable and no copy is on disk yet. */
  fallback?: string;
  /** Sync in the background on every launch. */
  syncOnLaunch?: boolean;
}

export const PUBLIC_APIS_SNAPSHOT_ID = 'bundled:public-apis';

/** The API Spec Zest Desktop preloads on first launch. */
export const PUBLIC_APIS_SPEC = Object.freeze({
  name: 'Lemonade public-apis',
  filename: 'Lemonade public-apis.json',
  source: Object.freeze({
    url: `${ENVIRONMENTS.staging.publicApis}/api-json`,
    includePaths: ['/api/v3/**'],
    baseUrlVariable: 'publicApis',
    authPreset: 'lemonade',
    fallback: PUBLIC_APIS_SNAPSHOT_ID,
    syncOnLaunch: true
  }) as ApiSpecSource
});
