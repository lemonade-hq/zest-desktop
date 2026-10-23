module.exports = {
  transform: {
    '^.+\\.(ts|js)$': 'babel-jest',
    // typebox ships ESM-only .mjs builds, and they live outside this package's babel root, so
    // they get their own inline preset instead of babel.config.js.
    '^.+\\.mjs$': ['babel-jest', {
      configFile: false,
      babelrc: false,
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]]
    }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(lodash-es|is-ip|ip-regex|super-regex|function-timeout|time-span|convert-hrtime|clone-regexp|is-regexp|typebox)/)'
  ],
  testEnvironment: 'node'
};
