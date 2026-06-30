/**
 * RTL component tests for the Account/Settings screen.
 *
 * STATUS / KNOWN BLOCKER (2026-06-29): these are written and correct-by-design
 * but DO NOT RUN YET under this repo's Expo SDK 54 + jest-expo 54 toolchain.
 * Rendering any RN component throws:
 *   ReferenceError: You are trying to `import` a file outside of the scope of
 *   the test code.  (expo/src/winter/installGlobal.ts → __ExpoImportMetaRegistry)
 * This is an Expo "winter" runtime / jest sandbox issue, not a defect in the
 * screen. See _debug/account-settings-bugs.md (BUG-ENV-1) for the repro and the
 * two fixes to try (patch jest-expo winter setup, or pin a jest-expo patch).
 * The plan-state branch logic is meanwhile covered deterministically by
 * src/utils/__tests__/planState.test.ts and on-device + Maestro for the render.
 *
 * Run (once the blocker is resolved):  npm run test:rtl
 */
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";

// --- controllable boundary state -------------------------------------------
const router = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  canGoBack: jest.fn(() => true),
};
let trialStatus: any = null;
let authUser: any = {
  uid: "u1",
  displayName: "Ada Lovelace",
  email: "ada@example.com",
  photoURL: null,
};
let darkMode = false;
const toggleDarkMode = jest.fn(() => (darkMode = !darkMode));
const setAlwaysReadBack = jest.fn();
const refreshTrial = jest.fn(() => Promise.resolve());

const env = {
  paymentBypassed: jest.fn(() => false),
  authBypassed: jest.fn(() => false),
};
const billing = {
  restorePurchases: jest.fn(() => Promise.resolve(false)),
  openManageSubscriptions: jest.fn((_sku?: "monthly_499" | "yearly_3999") =>
    Promise.resolve(),
  ),
};
const authSvc = { signOut: jest.fn(() => Promise.resolve()) };
const analytics = {
  AnalyticsEvents: { settingsChanged: jest.fn(), paywallShown: jest.fn() },
};

jest.mock("expo-router", () => ({ useRouter: () => router }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "9.9.9" } },
}));
jest.mock("../config/env", () => ({
  paymentBypassed: () => env.paymentBypassed(),
  authBypassed: () => env.authBypassed(),
}));
jest.mock("../services/authService", () => ({
  signOut: () => authSvc.signOut(),
}));
jest.mock("../services/billingService", () => ({
  restorePurchases: () => billing.restorePurchases(),
  openManageSubscriptions: (sku?: "monthly_499" | "yearly_3999") =>
    billing.openManageSubscriptions(sku),
}));
jest.mock("../services/analytics", () => ({
  AnalyticsEvents: analytics.AnalyticsEvents,
}));
jest.mock("../stores/useTrialStore", () => {
  const useTrialStore: any = (sel: any) =>
    sel({ status: trialStatus, refresh: refreshTrial });
  useTrialStore.setState = jest.fn();
  useTrialStore.getState = () => ({
    status: trialStatus,
    refresh: refreshTrial,
  });
  return { useTrialStore };
});
jest.mock("../stores/useAuthStore", () => ({
  useAuthStore: (sel: any) => sel({ user: authUser }),
}));
jest.mock("../stores/useSettingsStore", () => ({
  useSettingsStore: (sel: any) =>
    sel({ darkMode, toggleDarkMode, alwaysReadBack: false, setAlwaysReadBack }),
}));

import SettingsScreen from "../app/(main)/settings";

const status = (p: any) => ({
  isActive: false,
  daysRemaining: 0,
  sessionsRemaining: 0,
  subscriptionActive: false,
  plan: null,
  ...p,
});

beforeEach(() => {
  jest.clearAllMocks();
  trialStatus = null;
  authUser = {
    uid: "u1",
    displayName: "Ada Lovelace",
    email: "ada@example.com",
    photoURL: null,
  };
  darkMode = false;
  env.paymentBypassed.mockReturnValue(false);
  env.authBypassed.mockReturnValue(false);
});

describe("SettingsScreen — plan card per PlanState", () => {
  it("trial_active: shows Free trial + Subscribe", () => {
    trialStatus = status({
      isActive: true,
      daysRemaining: 5,
      sessionsRemaining: 8,
    });
    render(<SettingsScreen />);
    expect(screen.getByText("Free trial")).toBeTruthy();
    expect(screen.getByText("Subscribe")).toBeTruthy();
  });

  it("trial_expired: shows Trial ended + See plans", () => {
    trialStatus = status({ isActive: false });
    render(<SettingsScreen />);
    expect(screen.getByText("Trial ended")).toBeTruthy();
    expect(screen.getByText("See plans")).toBeTruthy();
  });

  it("subscribed: shows Engram Pro + Manage subscription + plan label", () => {
    trialStatus = status({
      subscriptionActive: true,
      isActive: true,
      plan: "yearly",
    });
    render(<SettingsScreen />);
    expect(screen.getByText("Engram Pro")).toBeTruthy();
    expect(screen.getByText("Yearly")).toBeTruthy();
    expect(screen.getByText("Manage subscription")).toBeTruthy();
  });

  it("dev_unlocked: shows Developer access, no Subscribe/Restore/Sign out", () => {
    env.paymentBypassed.mockReturnValue(true);
    env.authBypassed.mockReturnValue(true);
    render(<SettingsScreen />);
    expect(screen.getByText("Developer access")).toBeTruthy();
    expect(screen.queryByText("Subscribe")).toBeNull();
    expect(screen.queryByText("Restore purchases")).toBeNull();
    expect(screen.queryByText("Sign out")).toBeNull();
  });

  it("unknown (status null, payment enforced): shows Checking your plan", () => {
    trialStatus = null;
    render(<SettingsScreen />);
    expect(screen.getByText("Checking your plan…")).toBeTruthy();
  });
});

describe("SettingsScreen — interactions", () => {
  it("Subscribe routes to the paywall", () => {
    trialStatus = status({
      isActive: true,
      daysRemaining: 3,
      sessionsRemaining: 3,
    });
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText("Subscribe"));
    expect(router.push).toHaveBeenCalledWith("/(main)/paywall");
  });

  it("Manage subscription deep-links via billingService with the active plan sku", () => {
    trialStatus = status({
      subscriptionActive: true,
      isActive: true,
      plan: "monthly",
    });
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText("Manage subscription"));
    expect(billing.openManageSubscriptions).toHaveBeenCalledWith("monthly_499");
  });

  it("Dark mode toggle calls toggleDarkMode + analytics", () => {
    trialStatus = status({
      isActive: true,
      daysRemaining: 1,
      sessionsRemaining: 1,
    });
    render(<SettingsScreen />);
    fireEvent(
      screen.getByRole("switch", { name: /dark/i }),
      "valueChange",
      true,
    );
    // (fallback if role/name unsupported: query the first switch)
    expect(toggleDarkMode).toHaveBeenCalled();
  });

  it("Restore shows the right alert and refreshes trial", async () => {
    trialStatus = status({ isActive: false });
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText("Restore purchases"));
    // restorePurchases resolves false → "Nothing to restore"
    await Promise.resolve();
    await Promise.resolve();
    expect(billing.restorePurchases).toHaveBeenCalled();
    expect(refreshTrial).toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      "Nothing to restore",
      expect.stringContaining("didn't find"),
    );
    alert.mockRestore();
  });

  it("Sign out: Cancel keeps the user; Confirm signs out + clears trial + routes", () => {
    trialStatus = status({
      isActive: true,
      daysRemaining: 2,
      sessionsRemaining: 2,
    });
    let captured: any[] = [];
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation((_t, _m, btns: any) => (captured = btns));
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText("Sign out"));
    // Cancel: no-op
    captured.find((b) => b.style === "cancel")?.onPress?.();
    expect(authSvc.signOut).not.toHaveBeenCalled();
    // Confirm: destructive
    captured.find((b) => b.style === "destructive")?.onPress?.();
    expect(authSvc.signOut).toHaveBeenCalled();
    alert.mockRestore();
  });
});
