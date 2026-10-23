import React from 'react';

// Colours per variant. Mirrors assets/zest/zest-mark*.svg (ZestMark/index.spec.js enforces this).
export const ZEST_MARK_VARIANTS = {
  primary: { tile: '#000', z: '#FF0083' },
  dark: { tile: '#1A1A1A', z: '#FF0083' },
  production: { tile: '#FF0083', z: '#000' }
};

const ZestMark = ({ variant = 'primary', width = 26, className }) => {
  const colors = ZEST_MARK_VARIANTS[variant] || ZEST_MARK_VARIANTS.primary;
  return (
    <svg
      className={className}
      data-testid="zest-mark"
      data-variant={variant}
      width={width}
      height={width}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="100" height="100" rx="22" fill={colors.tile} />
      <g fill="none" stroke="#FFF" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 27 27 C 19 27 21 34 21 42 C 21 47 18 50 14 50 C 18 50 21 53 21 58 C 21 66 19 73 27 73" />
        <path d="M 73 27 C 81 27 79 34 79 42 C 79 47 82 50 86 50 C 82 50 79 53 79 58 C 79 66 81 73 73 73" />
      </g>
      <path
        d="M 36 34 H 64 L 36 66 H 64"
        fill="none"
        stroke={colors.z}
        strokeWidth="10"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
};

export default ZestMark;
