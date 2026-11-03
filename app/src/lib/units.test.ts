import { describe, expect, it } from "vitest";
import { PHP_PER_USD, formatPhp, formatUsd, fromUnits, toUnits } from "./units";

describe("toUnits", () => {
  it("parses whole and decimal amounts", () => {
    expect(toUnits("400")).toBe(4_000_000_000n);
    expect(toUnits("400.5")).toBe(4_005_000_000n);
    expect(toUnits("928.80")).toBe(9_288_000_000n);
    expect(toUnits("0.0000001")).toBe(1n);
    expect(toUnits("0")).toBe(0n);
    expect(toUnits(" 12 ")).toBe(120_000_000n);
  });
  it("throws on invalid input", () => {
    for (const bad of ["", " ", "-1", "-0.5", "abc", "1a", "1.", ".5", "1.23456789", "1,000", "1e3", "+5", "1.2.3"]) {
      expect(() => toUnits(bad), bad).toThrow(Error);
    }
  });
});

describe("fromUnits", () => {
  it("formats with 2 decimals by default, truncating", () => {
    expect(fromUnits(4_000_000_000n)).toBe("400.00");
    expect(fromUnits(9_566_640_000n)).toBe("956.66");
    expect(fromUnits(9_999_999n)).toBe("0.99");
    expect(fromUnits(0n)).toBe("0.00");
  });
  it("supports other decimal places", () => {
    expect(fromUnits(9_566_640_000n, 3)).toBe("956.664");
    expect(fromUnits(9_566_640_000n, 7)).toBe("956.6640000");
    expect(fromUnits(9_566_640_000n, 0)).toBe("956");
  });
  it("handles negatives", () => {
    expect(fromUnits(-4_005_000_000n)).toBe("-400.50");
    expect(fromUnits(-1n)).toBe("0.00");
  });
  it("round-trips", () => {
    expect(toUnits(fromUnits(123_456_789n, 7))).toBe(123_456_789n);
  });
});

describe("formatUsd / formatPhp", () => {
  it("formatUsd", () => {
    expect(formatUsd(9_566_640_000n)).toBe("$956.66");
    expect(formatUsd(100_000_000_000n)).toBe("$10,000.00");
    expect(formatUsd(12_345_678_900_000n)).toBe("$1,234,567.89");
    expect(formatUsd(0n)).toBe("$0.00");
  });
  it("formatPhp", () => {
    expect(PHP_PER_USD).toBe(58);
    expect(formatPhp(9_566_640_000n)).toBe("₱55,486");
    expect(formatPhp(8_600_000_000n)).toBe("₱49,880");
    expect(formatPhp(0n)).toBe("₱0");
  });
});
