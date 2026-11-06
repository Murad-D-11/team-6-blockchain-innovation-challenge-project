import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES, friendlyMessage } from "./errors";

describe("errors table", () => {
  it("has a message for every code 0-11", () => {
    for (let c = 0; c <= 11; c++) expect(friendlyMessage(c).length).toBeGreaterThan(10);
    expect(Object.keys(ERROR_MESSAGES)).toHaveLength(12);
  });
  it("unknown code falls back to the code-0 message", () => {
    expect(friendlyMessage(99)).toBe(friendlyMessage(0));
  });
  it("codes 1-11 are plain: non-empty, no v1 wording and no contract names", () => {
    const banned = ["lender", "InvalidShare", "InvalidRequestStatus", "Error(Contract"];
    for (let c = 1; c <= 11; c++) {
      const m = friendlyMessage(c);
      expect(m.trim().length).toBeGreaterThan(0);
      for (const b of banned) expect(m.toLowerCase()).not.toContain(b.toLowerCase());
    }
  });
});
