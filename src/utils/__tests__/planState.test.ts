import { derivePlanState } from "../planState";
import type { TrialStatus } from "../../services/trialService";

const status = (p: Partial<TrialStatus>): TrialStatus => ({
  isActive: false,
  daysRemaining: 0,
  sessionsRemaining: 0,
  subscriptionActive: false,
  ...p,
});

describe("derivePlanState", () => {
  it("dev bypass wins over any status (incl. the unlocked dev shape)", () => {
    expect(derivePlanState(null, true)).toBe("dev_unlocked");
    expect(
      derivePlanState(
        status({ subscriptionActive: true, isActive: true }),
        true,
      ),
    ).toBe("dev_unlocked");
  });

  it("null status (not bypassed) → unknown (still loading)", () => {
    expect(derivePlanState(null, false)).toBe("unknown");
  });

  it("active subscription → subscribed", () => {
    expect(
      derivePlanState(
        status({ subscriptionActive: true, isActive: true }),
        false,
      ),
    ).toBe("subscribed");
  });

  it("trial with days + sessions left → trial_active", () => {
    expect(
      derivePlanState(
        status({ isActive: true, daysRemaining: 5, sessionsRemaining: 8 }),
        false,
      ),
    ).toBe("trial_active");
  });

  it("trial used up, no subscription → trial_expired", () => {
    expect(derivePlanState(status({ isActive: false }), false)).toBe(
      "trial_expired",
    );
  });

  it("subscription takes priority over an expired trial", () => {
    expect(
      derivePlanState(
        status({ isActive: false, subscriptionActive: true }),
        false,
      ),
    ).toBe("subscribed");
  });
});

// Exhaustive truth table: every (subscriptionActive × isActive × paymentBypassed)
// cell. `plan` is carried on the status but must NOT influence the derived
// state — proven by sweeping it across all values in each cell.
describe("derivePlanState — full truth table", () => {
  const plans: Array<"monthly" | "yearly" | null> = ["monthly", "yearly", null];

  type Cell = {
    subscriptionActive: boolean;
    isActive: boolean;
    bypass: boolean;
    expected: string;
  };

  const cells: Cell[] = [
    // payment bypassed → always dev_unlocked, no matter the status
    {
      subscriptionActive: false,
      isActive: false,
      bypass: true,
      expected: "dev_unlocked",
    },
    {
      subscriptionActive: false,
      isActive: true,
      bypass: true,
      expected: "dev_unlocked",
    },
    {
      subscriptionActive: true,
      isActive: false,
      bypass: true,
      expected: "dev_unlocked",
    },
    {
      subscriptionActive: true,
      isActive: true,
      bypass: true,
      expected: "dev_unlocked",
    },
    // payment enforced → derive from status
    {
      subscriptionActive: true,
      isActive: true,
      bypass: false,
      expected: "subscribed",
    },
    {
      subscriptionActive: true,
      isActive: false,
      bypass: false,
      expected: "subscribed",
    },
    {
      subscriptionActive: false,
      isActive: true,
      bypass: false,
      expected: "trial_active",
    },
    // the edge the spec calls out: both flags false → expired
    {
      subscriptionActive: false,
      isActive: false,
      bypass: false,
      expected: "trial_expired",
    },
  ];

  for (const c of cells) {
    for (const plan of plans) {
      it(`sub=${c.subscriptionActive} active=${c.isActive} bypass=${c.bypass} plan=${plan} → ${c.expected}`, () => {
        expect(
          derivePlanState(
            status({
              subscriptionActive: c.subscriptionActive,
              isActive: c.isActive,
              plan,
            }),
            c.bypass,
          ),
        ).toBe(c.expected);
      });
    }
  }

  it("null status, payment enforced → unknown (and plan is irrelevant)", () => {
    expect(derivePlanState(null, false)).toBe("unknown");
  });
});
