export const SEARCH_TYPES = {
  DOCUMENTATION: 'documentation',
  COLLECTION: 'collection',
  FOLDER: 'folder',
  REQUEST: 'request'
};

export const MATCH_TYPES = {
  COLLECTION: 'collection',
  FOLDER: 'folder',
  REQUEST: 'request',
  URL: 'url',
  PATH: 'path',
  DOCUMENTATION: 'documentation'
};

export const SEARCH_CONFIG = {
  MAX_DEPTH: 20,
  FOCUS_DELAY: 100,
  SCROLL_BEHAVIOR: 'smooth',
  SCROLL_BLOCK: 'nearest',
  DEBOUNCE_DELAY: 300
};

export const DOCUMENTATION_RESULT = {
  type: SEARCH_TYPES.DOCUMENTATION,
  item: { id: 'docs', name: 'Zest Documentation' },
  name: 'Zest Documentation',
  path: '/',
  description: 'Browse the official Zest documentation',
  matchType: MATCH_TYPES.DOCUMENTATION
};
