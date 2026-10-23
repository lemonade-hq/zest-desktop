import { describe, expect, it } from '@jest/globals';
import { UpstreamError } from './errors';

describe('UpstreamError', () => {
  it('exposes the service, env and status', () => {
    const err = new UpstreamError('partners-service', 'sandbox', null);
    expect(err.service).toBe('partners-service');
    expect(err.env).toBe('sandbox');
    expect(err.status).toBeNull();
  });
});
