import { describe, expect, it } from "vitest";
import config from "./config";
import { ACCOUNT_ROLES, accountOf, isAccountRole, roleOf } from "./roles";

const A = config.accounts;

describe("roles", () => {
  it("accountOf returns the configured account for every account role", () => {
    for (const role of ACCOUNT_ROLES) expect(accountOf(role)).toBe(A[role]);
    expect(accountOf("clinic")).toBe(A.clinic);
    expect(accountOf("employer")).toBe(A.employer);
  });
  it("roleOf maps both the creditor and the clinic address to creditor", () => {
    expect(roleOf(A.creditor)).toBe("creditor");
    expect(roleOf(A.clinic)).toBe("creditor");
  });
  it("roleOf maps the other accounts and unknowns", () => {
    expect(roleOf(A.worker)).toBe("worker");
    expect(roleOf(A.family)).toBe("family");
    expect(roleOf(A.funder)).toBe("funder");
    expect(roleOf(A.admin)).toBe("admin");
    expect(roleOf(A.employer)).toBe("employer");
    expect(roleOf(A.issuer)).toBe("unknown");
    expect(roleOf(null)).toBe("unknown");
    expect(roleOf(undefined)).toBe("unknown");
  });
  it("isAccountRole accepts employer and clinic, rejects unknown", () => {
    expect(isAccountRole("employer")).toBe(true);
    expect(isAccountRole("clinic")).toBe(true);
    expect(isAccountRole("unknown")).toBe(false);
  });
});
