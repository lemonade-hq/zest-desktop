/**
 * Path filtering for OpenAPI documents, mirroring zest's `catalog.includePaths`
 * (lemonade-hq/zest `src/catalog/build.ts`). Globs follow node's `path.matchesGlob`
 * semantics for the subset we need: `**` crosses `/`, `*` and `?` do not.
 */

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

const escapeRegex = (value: string): string => value.replace(/[.+^${}()|[\]\\]/g, '\\$&');

export const globToRegExp = (glob: string): RegExp => {
  let source = '';
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === '*') {
      if (glob[i + 1] === '*') {
        i++;
        // `/**` at the end, or `/**/` in the middle, also matches zero segments.
        if (glob[i + 1] === '/') {
          i++;
          source += '(?:.*/)?';
        } else {
          source += '.*';
        }
      } else {
        source += '[^/]*';
      }
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += escapeRegex(char);
    }
  }
  return new RegExp(`^${source}$`);
};

export const matchesAnyGlob = (value: string, globs: readonly string[]): boolean =>
  globs.some((glob) => globToRegExp(glob).test(value));

type OpenApiDocument = {
  paths?: Record<string, Record<string, unknown> | undefined>;
  tags?: Array<{ name?: string }>;
  [key: string]: unknown;
};

const usedTagNames = (paths: Record<string, Record<string, unknown> | undefined>): Set<string> => {
  const names = new Set<string>();
  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as { tags?: unknown } | undefined;
      if (operation && Array.isArray(operation.tags)) {
        operation.tags.forEach((tag) => typeof tag === 'string' && names.add(tag));
      }
    }
  }
  return names;
};

/**
 * Returns a copy of `doc` keeping only the paths that match one of `includePaths`.
 * An empty or missing `includePaths` keeps every path. Top-level tags no kept
 * operation references are dropped; `components` is left whole.
 */
export function filterOpenApiPaths<T extends OpenApiDocument>(doc: T, includePaths?: readonly string[] | null): T {
  if (!doc || typeof doc !== 'object' || !includePaths || includePaths.length === 0) return doc;

  const paths = doc.paths && typeof doc.paths === 'object' ? doc.paths : {};
  const kept: Record<string, Record<string, unknown> | undefined> = {};
  for (const [path, pathItem] of Object.entries(paths)) {
    if (matchesAnyGlob(path, includePaths)) kept[path] = pathItem;
  }

  const result: T = { ...doc, paths: kept };
  if (Array.isArray(doc.tags)) {
    const used = usedTagNames(kept);
    result.tags = doc.tags.filter((tag) => tag && typeof tag.name === 'string' && used.has(tag.name));
  }
  return result;
}
