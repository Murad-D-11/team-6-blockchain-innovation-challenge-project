import config from "./config";
import type { Role } from "./types";

/**
 * Roles that map to a demo account. Everything in Role except "unknown", plus the mock-only
 * "clinic": the app treats the clinic as a "creditor" (provider), see roleOf.
 */
export type AccountRole = Exclude<Role, "unknown"> | "clinic";

export const ACCOUNT_ROLES: readonly AccountRole[] = [
  "worker",
  "family",
  "funder",
  "creditor",
  "admin",
  "employer",
  "clinic",
];

export function isAccountRole(x: unknown): x is AccountRole {
  return typeof x === "string" && (ACCOUNT_ROLES as readonly string[]).includes(x);
}

/** The account in config/testnet.json for a role. */
export function accountOf(role: AccountRole): string {
  return config.accounts[role];
}

/** Match an address to a role via config/testnet.json. Anything else is "unknown". Clinic and creditor are both "creditor". */
export function roleOf(address: string | null | undefined): Role {
  if (!address) return "unknown";
  for (const role of ACCOUNT_ROLES) {
    if (config.accounts[role] === address) return role === "clinic" ? "creditor" : role;
  }
  return "unknown";
}
