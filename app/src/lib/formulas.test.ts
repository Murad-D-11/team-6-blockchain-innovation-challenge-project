import { describe, expect, it } from "vitest";
import { isOverdue, legalAmount, missedPeriods, outstandingFor, split } from "./formulas";

// v2 golden numbers (docs/PLAN-v2.md, "New golden numbers").
describe("golden numbers", () => {
  it("invoice amount: legal amount = principal", () => {
    expect(legalAmount(1_900_000_000n, 12)).toBe(1_900_000_000n);
  });
  it("loan fee", () => {
    expect(outstandingFor(1_900_000_000n, "Loan", 300)).toBe(1_957_000_000n);
  });
  it("normal remit", () => {
    expect(split(4_000_000_000n, 1500, 1_957_000_000n)).toEqual({
      toLender: 600_000_000n,
      toFamily: 3_400_000_000n,
      outstanding: 1_357_000_000n,
    });
  });
  it("final remit", () => {
    expect(split(4_000_000_000n, 1500, 157_000_000n)).toEqual({
      toLender: 157_000_000n,
      toFamily: 3_843_000_000n,
      outstanding: 0n,
    });
  });
  it("grant", () => {
    expect(outstandingFor(650_000_000n, "Grant", 0)).toBe(0n);
    expect(split(4_000_000_000n, 1500, 0n)).toEqual({
      toLender: 0n,
      toFamily: 4_000_000_000n,
      outstanding: 0n,
    });
  });
  it("dust remit", () => {
    expect(split(50_000_000n, 1500, 1_957_000_000n).toLender).toBe(7_500_000n);
  });
  it("repayment path for the 190 USDC loan at 15% with 400 USDC remittances", () => {
    let outstanding = outstandingFor(legalAmount(1_900_000_000n, 12), "Loan", 300);
    const path: bigint[] = [];
    for (let i = 0; i < 5; i++) {
      outstanding = split(4_000_000_000n, 1500, outstanding).outstanding;
      path.push(outstanding);
    }
    expect(path).toEqual([1_357_000_000n, 757_000_000n, 157_000_000n, 0n, 0n]);
  });
});

describe("truncating division", () => {
  it("legal amount never changes the principal", () => {
    expect(legalAmount(1n, 1)).toBe(1n);
    expect(legalAmount(150_000n, 7)).toBe(150_000n);
  });
  it("fee truncates", () => {
    expect(outstandingFor(10_001n, "Loan", 1)).toBe(10_001n + 1n);
  });
  it("share truncates", () => {
    expect(split(19n, 1500, 1_000n).toLender).toBe(2n); // 19*1500/10000 = 2.85 -> 2
  });
});

describe("missedPeriods / isOverdue", () => {
  const base = { status: "Active" as const, lastPaymentAt: 1000, periodSecs: 60 };
  it("counts whole periods", () => {
    expect(missedPeriods({ ...base, now: 1000 })).toBe(0);
    expect(missedPeriods({ ...base, now: 1059 })).toBe(0);
    expect(missedPeriods({ ...base, now: 1060 })).toBe(1);
    expect(missedPeriods({ ...base, now: 1000 + 60 * 4 })).toBe(4);
  });
  it("is 0 when repaid", () => {
    expect(missedPeriods({ ...base, status: "Repaid", now: 99_999 })).toBe(0);
  });
  it("overdue only when strictly more than max", () => {
    expect(isOverdue(3, 3)).toBe(false);
    expect(isOverdue(4, 3)).toBe(true);
    expect(isOverdue(0, 3)).toBe(false);
  });
});
