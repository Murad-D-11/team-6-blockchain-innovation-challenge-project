import { describe, expect, it } from "vitest";
import { LayaError } from "../types";
import {
  bytesToHex, hexToBytes, loanStatusFromNumber, modeFromNumber, modeToNumber,
  parseContractError, requestStatusFromNumber, u64ToNumber,
} from "./translate";

describe("enums", () => {
  it("maps numbers to strings", () => {
    expect([0, 1].map(modeFromNumber)).toEqual(["Loan", "Grant"]);
    expect([0, 1, 2, 3].map(requestStatusFromNumber)).toEqual(["Open", "Confirmed", "Funded", "Cancelled"]);
    expect([0, 1].map(loanStatusFromNumber)).toEqual(["Active", "Repaid"]);
  });
  it("throws on unknown numbers", () => {
    expect(() => modeFromNumber(2)).toThrow();
    expect(() => requestStatusFromNumber(4)).toThrow();
    expect(() => loanStatusFromNumber(-1)).toThrow();
    expect(() => modeFromNumber(0.5)).toThrow();
  });
  it("modeToNumber", () => {
    expect(modeToNumber("Loan")).toBe(0);
    expect(modeToNumber("Grant")).toBe(1);
    expect(() => modeToNumber("x" as never)).toThrow();
  });
});

describe("hex", () => {
  const hex = "00ff10" + "ab".repeat(29);
  it("round-trips", () => {
    expect(bytesToHex(hexToBytes(hex))).toBe(hex);
    expect(hexToBytes(hex.toUpperCase()).length).toBe(32);
    expect(bytesToHex(hexToBytes(hex.toUpperCase()))).toBe(hex);
  });
  it("validates", () => {
    for (const bad of ["", "ab", "0x" + hex.slice(2), hex + "0", "zz".repeat(32)]) {
      expect(() => hexToBytes(bad)).toThrow();
    }
    expect(() => bytesToHex(new Uint8Array(31))).toThrow();
  });
});

describe("u64ToNumber", () => {
  it("converts safe values", () => {
    expect(u64ToNumber(1_700_000_000n)).toBe(1_700_000_000);
    expect(u64ToNumber(BigInt(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
  });
  it("throws above MAX_SAFE_INTEGER", () => {
    expect(() => u64ToNumber(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow();
  });
});

describe("parseContractError", () => {
  it("reads codes 1-11", () => {
    const e = parseContractError(new Error("HostError: Error(Contract, #7)\nEvent log..."));
    expect(e).toBeInstanceOf(LayaError);
    expect(e.code).toBe(7);
    expect(e.message).toMatch(/share/i);
    expect(parseContractError("Error(Contract, #11)").code).toBe(11);
  });
  it("falls back to code 0", () => {
    for (const x of [new Error("Error(Contract, #0)"), new Error("Error(Contract, #12)"), new Error("boom"), "nope", null, 42]) {
      const e = parseContractError(x);
      expect(e).toBeInstanceOf(LayaError);
      expect(e.code).toBe(0);
    }
  });
  it("passes LayaError through", () => {
    const orig = new LayaError(0, "Switch Freighter to Testnet");
    expect(parseContractError(orig)).toBe(orig);
  });
});
