/**
 * Tests for the auth/payment gate flags + dev bypass in env.ts.
 * The critical invariant: a release binary (__DEV__ === false) can NEVER
 * bypass a gate, even if a stray APP_MODE / override leaked into `extra`.
 */

const mockExtra: { current: Record<string, unknown> } = { current: {} };

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: mockExtra.current };
    },
  },
}));

import * as env from "../env";

function scenario(opts: {
  dev: boolean;
  appMode?: string | null;
  authRequired?: boolean;
  paymentRequired?: boolean;
}) {
  (global as any).__DEV__ = opts.dev;
  mockExtra.current = {
    appMode: opts.appMode ?? null,
    authRequired: opts.authRequired ?? false,
    paymentRequired: opts.paymentRequired ?? false,
  };
}

describe("env — gate flags & dev bypass", () => {
  describe("release binary (__DEV__ === false)", () => {
    it("requires both gates even if APP_MODE=dev + overrides leaked into extra", () => {
      // In a dev binary these overrides would BYPASS; a release must ignore them.
      scenario({
        dev: false,
        appMode: "dev",
        authRequired: false,
        paymentRequired: false,
      });
      expect(env.requiresAuth()).toBe(true);
      expect(env.requiresPayment()).toBe(true);
      expect(env.authBypassed()).toBe(false);
      expect(env.paymentBypassed()).toBe(false);
    });
  });

  describe("dev binary (__DEV__ === true)", () => {
    it("bypasses both gates by default", () => {
      scenario({ dev: true, appMode: "dev" });
      expect(env.requiresAuth()).toBe(false);
      expect(env.requiresPayment()).toBe(false);
      expect(env.authBypassed()).toBe(true);
      expect(env.paymentBypassed()).toBe(true);
    });

    it("AUTH_REQUIRED forces only the auth gate on", () => {
      scenario({ dev: true, appMode: "dev", authRequired: true });
      expect(env.requiresAuth()).toBe(true);
      expect(env.requiresPayment()).toBe(false);
    });

    it("PAYMENT_REQUIRED forces only the payment gate on", () => {
      scenario({ dev: true, appMode: "dev", paymentRequired: true });
      expect(env.requiresAuth()).toBe(false);
      expect(env.requiresPayment()).toBe(true);
    });

    it("explicit production mode requires both even in a dev binary", () => {
      scenario({ dev: true, appMode: "production" });
      expect(env.requiresAuth()).toBe(true);
      expect(env.requiresPayment()).toBe(true);
    });
  });

  describe("logBypassStatus", () => {
    it("warns and names the bypassed gates", () => {
      scenario({ dev: true, appMode: "dev" });
      const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
      env.logBypassStatus();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toContain("AUTH + PAYMENT");
      spy.mockRestore();
    });

    it("is silent when nothing is bypassed", () => {
      scenario({ dev: false, appMode: "production" });
      const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
      env.logBypassStatus();
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
