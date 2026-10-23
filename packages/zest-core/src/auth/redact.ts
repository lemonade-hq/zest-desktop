/** Keys whose values must never reach a log line, at any depth. */
const SENSITIVE_KEY = /authorization|client_?secret|password|access_?token/i;
export const REDACTED = '[REDACTED]';

/**
 * Returns a copy of a log context with every sensitive key's value replaced, at any depth. Every
 * log call in src/auth passes its context through here. The input is not mutated.
 */
export function redact(context: Record<string, unknown>): Record<string, unknown> {
  return redactValue(context) as Record<string, unknown>;
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : redactValue(inner)])
    );
  }
  return value;
}
