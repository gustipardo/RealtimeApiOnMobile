module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      {
        presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'],
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
};
