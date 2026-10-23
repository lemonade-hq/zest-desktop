/**
 * Zest: the optional `source` block stored with an API Spec entry in workspace.yml.
 *
 *   specs:
 *     - name: "Lemonade public-apis"
 *       path: "apispec/Lemonade public-apis.json"
 *       source:
 *         url: "https://public-apis-master.lmndstaging.com/api-json"
 *         includePaths:
 *           - "/api/v3/**"
 *         baseUrlVariable: "publicApis"
 *         authPreset: "lemonade"
 *         fallback: "bundled:public-apis"
 *         syncOnLaunch: true
 */

const STRING_FIELDS = ['url', 'baseUrlVariable', 'authPreset', 'fallback'];

const sanitizeApiSpecSource = (source) => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return null;
  }

  const sanitized = {};
  for (const field of STRING_FIELDS) {
    if (typeof source[field] === 'string' && source[field].trim() !== '') {
      sanitized[field] = source[field].trim();
    }
  }
  if (Array.isArray(source.includePaths)) {
    const includePaths = source.includePaths.filter((p) => typeof p === 'string' && p.trim() !== '').map((p) => p.trim());
    if (includePaths.length > 0) {
      sanitized.includePaths = includePaths;
    }
  }
  if (source.syncOnLaunch === true) {
    sanitized.syncOnLaunch = true;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
};

const apiSpecSourceToYamlLines = (source, indent, quote) => {
  const sanitized = sanitizeApiSpecSource(source);
  if (!sanitized) {
    return [];
  }

  const lines = [`${indent}source:`];
  const inner = `${indent}  `;
  if (sanitized.url) lines.push(`${inner}url: ${quote(sanitized.url)}`);
  if (sanitized.includePaths) {
    lines.push(`${inner}includePaths:`);
    sanitized.includePaths.forEach((p) => lines.push(`${inner}  - ${quote(p)}`));
  }
  if (sanitized.baseUrlVariable) lines.push(`${inner}baseUrlVariable: ${quote(sanitized.baseUrlVariable)}`);
  if (sanitized.authPreset) lines.push(`${inner}authPreset: ${quote(sanitized.authPreset)}`);
  if (sanitized.fallback) lines.push(`${inner}fallback: ${quote(sanitized.fallback)}`);
  if (sanitized.syncOnLaunch) lines.push(`${inner}syncOnLaunch: true`);
  return lines;
};

module.exports = { sanitizeApiSpecSource, apiSpecSourceToYamlLines };
