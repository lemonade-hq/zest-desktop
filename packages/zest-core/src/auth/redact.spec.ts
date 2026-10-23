import { describe, expect, it } from '@jest/globals';
import { REDACTED, redact } from './redact';

describe('redact', () => {
  it('replaces sensitive keys at any depth and leaves the rest', () => {
    const context = {
      env: 'sandbox',
      headers: { Authorization: 'Bearer abc', accept: 'json' },
      nested: [{ clientSecret: 'cs', client_secret: 'cs2', password: 'pw', access_token: 't' }]
    };

    expect(redact(context)).toEqual({
      env: 'sandbox',
      headers: { Authorization: REDACTED, accept: 'json' },
      nested: [{ clientSecret: REDACTED, client_secret: REDACTED, password: REDACTED, access_token: REDACTED }]
    });
  });

  it('does not mutate its input', () => {
    const context = { authorization: 'Bearer abc' };
    redact(context);
    expect(context.authorization).toBe('Bearer abc');
  });
});
