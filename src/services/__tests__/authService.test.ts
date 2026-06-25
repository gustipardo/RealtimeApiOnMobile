/**
 * Tests for the authService bypass: when the auth gate is bypassed (dev), a
 * deterministic fake user is returned and Firebase/Google are never touched;
 * when required, the real Firebase user is mapped to AppUser.
 */

jest.mock("@react-native-firebase/auth", () => {
  const realUser = {
    uid: "real-uid",
    email: "real@example.com",
    displayName: "Real Person",
    photoURL: "http://photo",
  };
  const authFn: any = jest.fn(() => ({
    currentUser: realUser,
    signInWithCredential: jest.fn().mockResolvedValue({ user: realUser }),
    signOut: jest.fn().mockResolvedValue(undefined),
    onAuthStateChanged: jest.fn(() => () => {}),
  }));
  authFn.GoogleAuthProvider = { credential: jest.fn(() => "google-cred") };
  return { __esModule: true, default: authFn };
});

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({ data: { idToken: "tok" } }),
    revokeAccess: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../config/env", () => ({
  authBypassed: jest.fn(),
}));

import {
  getCurrentUser,
  signInWithGoogle,
  signOut,
  FAKE_DEV_USER,
} from "../authService";
import { authBypassed } from "../../config/env";
import authDefault from "@react-native-firebase/auth";

const mockBypass = authBypassed as jest.Mock;

describe("authService", () => {
  afterEach(() => jest.clearAllMocks());

  describe("auth bypassed (dev)", () => {
    beforeEach(() => mockBypass.mockReturnValue(true));

    it("getCurrentUser returns the fake dev user without touching Firebase", () => {
      expect(getCurrentUser()).toEqual(FAKE_DEV_USER);
      expect(authDefault).not.toHaveBeenCalled();
    });

    it("signInWithGoogle resolves the fake user without Google/Firebase", async () => {
      await expect(signInWithGoogle()).resolves.toEqual(FAKE_DEV_USER);
      expect(authDefault).not.toHaveBeenCalled();
    });

    it("signOut is a no-op", async () => {
      await expect(signOut()).resolves.toBeUndefined();
      expect(authDefault).not.toHaveBeenCalled();
    });
  });

  describe("auth required", () => {
    beforeEach(() => mockBypass.mockReturnValue(false));

    it("getCurrentUser maps the real Firebase user to AppUser", () => {
      expect(getCurrentUser()).toEqual({
        uid: "real-uid",
        email: "real@example.com",
        displayName: "Real Person",
        photoURL: "http://photo",
      });
    });

    it("signInWithGoogle goes through Google + Firebase and returns the mapped user", async () => {
      const user = await signInWithGoogle();
      expect(user.uid).toBe("real-uid");
      expect(authDefault).toHaveBeenCalled();
    });
  });
});
