import { Keypair } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { isValidAccount, shortAddress } from "./address";
import { config } from "./config";

describe("address", () => {
  it("accepts valid account addresses", () => {
    expect(isValidAccount(Keypair.random().publicKey())).toBe(true);
    for (const a of Object.values(config.accounts)) expect(isValidAccount(a)).toBe(true);
  });
  it("rejects invalid ones", () => {
    expect(isValidAccount("")).toBe(false);
    expect(isValidAccount("GABC")).toBe(false);
    expect(isValidAccount(config.contractId)).toBe(false); // C-address is not an account
    expect(isValidAccount(config.accounts.worker.slice(0, -1) + "A")).toBe(false); // bad checksum
  });
  it("shortAddress is first 4 + ellipsis + last 4, any prefix", () => {
    expect(shortAddress("GAJERAAWQYNSGHE5WOYO5OD2CVS42NCRUNLDQE5QHTRXS4TLPEXUF4JO")).toBe("GAJE…F4JO");
    expect(shortAddress("WABCDEFGHIJKLMNOP")).toBe("WABC…MNOP");
  });
});

describe("config", () => {
  it("has the placeholder shape", () => {
    expect(config.periodSecs).toBe(60);
    expect(config.maxPausePeriods).toBe(3);
    // Tolerant: passes with the six-account or the eight-account (clinic, employer) testnet.json.
    for (const key of ["admin", "issuer", "worker", "family", "funder", "creditor"]) {
      expect(Object.keys(config.accounts)).toContain(key);
    }
  });
});
