import { describe, it, expect } from '@jest/globals';
import { ENVIRONMENTS } from './environments';

describe('ENVIRONMENTS', () => {
  it.each(Object.entries(ENVIRONMENTS))('%s hosts are https URLs with no trailing slash', (_env, hosts) => {
    expect(Object.keys(hosts).sort()).toEqual(['authService', 'partnersService', 'publicApis']);
    for (const host of Object.values(hosts)) {
      expect(new URL(host).protocol).toBe('https:');
      expect(host.endsWith('/')).toBe(false);
    }
  });
});
