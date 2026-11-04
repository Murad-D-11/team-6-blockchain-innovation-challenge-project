import { LayaError, type LoanStatus, type Mode, type RequestStatus } from "../types";
import { friendlyMessage } from "../errors";

const MODES: readonly Mode[] = ["Loan", "Grant"];
const REQUEST_STATUSES: readonly RequestStatus[] = ["Open", "Confirmed", "Funded", "Cancelled"];
const LOAN_STATUSES: readonly LoanStatus[] = ["Active", "Repaid"];

function fromNumber<T>(table: readonly T[], n: number, what: string): T {
  const v = Number.isInteger(n) ? table[n] : undefined;
  if (v === undefined) throw new Error(`Unknown ${what}: ${n}`);
  return v;
}

export const modeFromNumber = (n: number): Mode => fromNumber(MODES, n, "Mode");
export const requestStatusFromNumber = (n: number): RequestStatus => fromNumber(REQUEST_STATUSES, n, "RequestStatus");
export const loanStatusFromNumber = (n: number): LoanStatus => fromNumber(LOAN_STATUSES, n, "LoanStatus");

export function modeToNumber(mode: Mode): number {
  const i = MODES.indexOf(mode);
  if (i < 0) throw new Error(`Unknown Mode: ${String(mode)}`);
  return i;
}

/** 32 bytes -> 64 lowercase hex chars, no 0x. */
export function bytesToHex(bytes: Uint8Array): string {
  if (bytes.length !== 32) throw new Error(`Expected 32 bytes, got ${bytes.length}`);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/** Exactly 64 hex chars (no 0x) -> Buffer. Case-insensitive input. */
export function hexToBytes(hex: string): Buffer {
  if (typeof hex !== "string" || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("Expected exactly 64 hex characters");
  }
  return Buffer.from(hex, "hex");
}

/** u64 (bigint) -> number for timestamps and periodSecs. Throws above MAX_SAFE_INTEGER. */
export function u64ToNumber(x: bigint): number {
  if (x < 0n || x > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`u64 out of safe range: ${x}`);
  return Number(x);
}

/** Contract error 1-11 from `Error(Contract, #n)` in the message; anything else is LayaError(0). */
export function parseContractError(err: unknown): LayaError {
  if (err instanceof LayaError) return err;
  const text = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const m = /Error\(Contract, #(\d+)\)/.exec(text);
  if (m) {
    const code = Number(m[1]);
    if (code >= 1 && code <= 11) return new LayaError(code, friendlyMessage(code));
  }
  return new LayaError(0, friendlyMessage(0));
}
