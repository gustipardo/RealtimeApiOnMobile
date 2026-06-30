// React Native Testing Library config — renders real RN components under the
// `jest-expo` preset (jsdom-free; react-test-renderer). Kept separate from the
// node-env `jest.config.js` (which stubs react-native for fast logic tests).
//
// Run with:  npm run test:rtl   (or: npx jest --config jest.config.rtl.js)
// Test files: *.rtl.test.tsx
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.rtl.setup.js"],
  testMatch: ["**/__tests__/**/*.rtl.test.tsx"],
  // NativeWind's babel preset rewrites JSX to its own jsx-runtime, whose
  // css-interop runtime calls Appearance.getColorScheme() at import and
  // crashes under the test renderer. The screens under test use inline styles
  // (no className), so route JSX through React's plain runtime instead.
  moduleNameMapper: {
    "^nativewind/jsx-runtime$": "react/jsx-runtime",
    "^nativewind/jsx-dev-runtime$": "react/jsx-dev-runtime",
    "^react-native-css-interop/jsx-runtime$": "react/jsx-runtime",
    "^react-native-css-interop/jsx-dev-runtime$": "react/jsx-dev-runtime",
  },
};
