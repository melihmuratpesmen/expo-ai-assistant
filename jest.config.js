/** @type {import('jest').Config} */
module.exports = {
  preset: 'react-native',
  roots: ['<rootDir>/src'],
  modulePathIgnorePatterns: ['<rootDir>/example/', '<rootDir>/lib/'],
  setupFiles: ['react-native-gesture-handler/jestSetup.js', '<rootDir>/jest.setup.js'],
  transform: {
    // Inline Babel config so the library does not ship a root babel.config.js
    // that Metro could pick up from the example app.
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      {
        configFile: false,
        babelrc: false,
        presets: ['module:@react-native/babel-preset'],
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native(-.*)?|@react-native(-community)?|@expo|expo(-.*)?|@gorhom)/)',
  ],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
};
