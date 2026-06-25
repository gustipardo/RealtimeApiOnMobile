// Stub for expo-constants under Jest. The real package pulls in
// expo-modules-core (ESM, can't be parsed by babel-jest without a
// custom transform). We only need `expoConfig.extra` in production;
// in tests, individual files that exercise env-var driven paths mock
// this directly with `jest.mock('expo-constants', ...)` and provide
// whatever `extra` shape the test needs.
const expoConfig = { extra: {} };

module.exports = {
  __esModule: true,
  default: {
    get expoConfig() {
      return expoConfig;
    },
  },
  // Non-default access pattern some code uses.
  expoConfig,
};
