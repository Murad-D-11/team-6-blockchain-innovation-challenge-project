import config from "./config";
import type { Role } from "./types";

/** Roles that map to a demo account (everything in Role except "unknown"). */
export type AccountRole = Exclude<Role, "unknown">;

export const ACCOUNT_ROLES: readonly AccountRole[] = ["worker", "family", "funder", "creditor", "admin"];

export function isAccountRole(x: unknown): x is AccountRole {
  return typeof x === "string" && (ACCOUNT_ROLES as readonly string[]).includes(x);
}

/** The account in config/testnet.json for a role. */
export function accountOf(role: AccountRole): string {
  return config.accounts[role];
}

/** Match an address to a role via config/testnet.json. Anything else is "unknown". */
export function roleOf(address: string | null | undefined): Role {
  if (!address) return "unknown";
  for (const role of ACCOUNT_ROLES) {
    if (config.accounts[role] === address) return role;
  }
  return "unknown";
}
