import { StrKey } from "@stellar/stellar-sdk";

/** Valid classic account strkey. Never test for a "G" prefix (Protocol 30 adds W addresses). */
export function isValidAccount(addr: string): boolean {
  return typeof addr === "string" && StrKey.isValidEd25519PublicKey(addr);
}

/** First 4 + "…" + last 4. Makes no assumption about the prefix. */
export function shortAddress(addr: string): string {
  if (addr.length <= 9) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
