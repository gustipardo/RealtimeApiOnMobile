// Minimal react-native stub for Jest (node env).
// sessionManager imports PermissionsAndroid to pre-gate the mic FGS call.
// Default: check returns true (permission granted) — the happy path.
// Override per-test with jest.mock('react-native', () => ({ ... })).
module.exports = {
  PermissionsAndroid: {
    PERMISSIONS: {
      RECORD_AUDIO: "android.permission.RECORD_AUDIO",
    },
    check: jest.fn().mockResolvedValue(true),
    request: jest.fn().mockResolvedValue("granted"),
  },
};
