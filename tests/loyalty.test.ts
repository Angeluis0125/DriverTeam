import { describe, expect, it } from "vitest";
import { loyaltyStatus } from "@/lib/loyalty";

const prog = { active: true, trips_required: 3, discount_pct: 20 };

describe("loyaltyStatus", () => {
  it("inactivo sin programa", () => {
    expect(loyaltyStatus(null, 5).nextIsRewarded).toBe(false);
    expect(loyaltyStatus({ ...prog, active: false }, 3).nextIsRewarded).toBe(false);
  });
  it("premia el viaje N+1 y reinicia el ciclo", () => {
    const seq = [0, 1, 2, 3, 4, 5, 6, 7].map((t) => loyaltyStatus(prog, t).nextIsRewarded);
    expect(seq).toEqual([false, false, false, true, false, false, false, true]);
    expect(loyaltyStatus(prog, 3).discountPct).toBe(20);
    expect(loyaltyStatus(prog, 4).progress).toBe(0);
  });
});
