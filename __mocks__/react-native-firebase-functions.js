// Stub for @react-native-firebase/functions under Jest. The real package
// uses ESM (`export * from`) which jest's babel transform doesn't handle
// without a custom config — and the package isn't meaningful in a node
// test environment anyway. Tests that need to exercise a Cloud Function
// call should mock the service that uses it (e.g. `jest.mock('../trialService',
// () => ({ recordSession: jest.fn().mockResolvedValue(...) }))`) rather
// than trying to stub the functions SDK.
const noop = () => Promise.resolve({ data: null });

module.exports = {
  __esModule: true,
  default: () => ({
    httpsCallable: () => noop,
  }),
};
