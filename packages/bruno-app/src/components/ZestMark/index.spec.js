/* global __dirname */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { render } from '@testing-library/react';
import ZestMark, { ZEST_MARK_VARIANTS } from './index';

const FILES = {
  primary: 'zest-mark.svg',
  dark: 'zest-mark-dark.svg',
  production: 'zest-mark-production.svg'
};

describe('ZestMark', () => {
  Object.entries(FILES).forEach(([variant, file]) => {
    it(`${variant} matches assets/zest/${file}`, () => {
      const svg = fs.readFileSync(path.join(__dirname, '../../assets/zest', file), 'utf8');
      const tile = svg.match(/<rect[^>]*fill="([^"]+)"/)[1];
      const z = svg.match(/<path d="M 36[^>]*stroke="([^"]+)"/)[1];
      expect(ZEST_MARK_VARIANTS[variant]).toEqual({ tile, z });

      const { container } = render(<ZestMark variant={variant} width={40} />);
      const el = container.querySelector('svg');
      expect(el.getAttribute('width')).toBe('40');
      expect(el.querySelector('rect').getAttribute('fill')).toBe(tile);
    });
  });

  it('falls back to primary for unknown variants', () => {
    const { container } = render(<ZestMark variant="nope" />);
    expect(container.querySelector('rect').getAttribute('fill')).toBe('#000');
  });
});
