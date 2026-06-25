module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.[jt]sx?$": [
      "babel-jest",
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" } }],
          "@babel/preset-typescript",
        ],
      },
    ],
  },
  // Map static asset imports to a stub so Jest doesn't try to parse binaries
  // (Metro resolves `require('./foo.mp3')` to an asset module at build time;
  // Jest with babel-jest only knows about JS/TS).
  moduleNameMapper: {
    "\\.(mp3|wav|m4a|ogg|aac|png|jpg|jpeg|gif|svg)$":
      "<rootDir>/__mocks__/assetStub.js",
    // Stub native-only deps that may not be present in dev env at install time.
    // Tests that need to assert behavior override with `jest.mock(...)`.
    "^expo-audio$": "<rootDir>/__mocks__/expo-audio.js",
    // Stub Expo modules that pull in ESM-only deps. Tests that exercise
    // env-var driven paths should still `jest.mock('expo-constants', ...)`
    // on top of this stub to provide a specific `extra` shape.
    "^expo-constants$": "<rootDir>/__mocks__/expo-constants.js",
    // Stub the Firebase Functions SDK — the real package is ESM and isn't
    // meaningful in a node test env. Tests that need to exercise a Cloud
    // Function call should mock the service that uses it (trialService,
    // billingService) rather than trying to stub the SDK itself.
    "^@react-native-firebase/functions$":
      "<rootDir>/__mocks__/react-native-firebase-functions.js",
    // react-native uses ESM syntax incompatible with the node Jest env.
    // Stub the subset used by production code (PermissionsAndroid in sessionManager).
    "^react-native$": "<rootDir>/__mocks__/react-native.js",
  },
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  setupFiles: ["<rootDir>/jest.setup.js"],
};
