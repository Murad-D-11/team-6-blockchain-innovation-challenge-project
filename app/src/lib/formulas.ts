/** Exact bigint copies of the contract rules (Shared contract A). Division truncates. */

export const MIN_SHARE_BPS = 100;
export const MAX_SHARE_BPS = 1500;
export const MAX_FEE_BPS = 800;
export const MIN_MONTHS = 1;
export const MAX_MONTHS = 60;
export const MAX_PRINCIPAL = 1_000_000_000_000_000n;
/** A payment to the lender of at least 1 USDC resets the pause clock. */
export const PAUSE_RESET_MIN = 10_000_000n;

/**
 * v2: legal_amount = principal. v2 charges no interest, so `months` no longer affects the amount;
 * it stays in the signature because the contract still validates it (1 to 60).
 */
export function legalAmount(principal: bigint, _months: number): bigint {
  return principal;
}

/** Loan: legal + legal * feeBps / 10000. Grant: 0. */
export function outstandingFor(legal: bigint, mode: "Loan" | "Grant", feeBps: number): bigint {
  if (mode === "Grant") return 0n;
  return legal + (legal * BigInt(feeBps)) / 10000n;
}

/** to_lender = min(amount * share / 10000, outstanding); to_family = amount - to_lender. */
export function split(
  amount: bigint,
  shareBps: number,
  outstanding: bigint,
): { toLender: bigint; toFamily: bigint; outstanding: bigint } {
  const share = (amount * BigInt(shareBps)) / 10000n;
  const toLender = share < outstanding ? share : outstanding;
  return { toLender, toFamily: amount - toLender, outstanding: outstanding - toLender };
}

/** 0 if Repaid, else (now - lastPaymentAt) / periodSecs. Times in unix seconds. */
export function missedPeriods(p: {
  status: "Active" | "Repaid";
  now: number;
  lastPaymentAt: number;
  periodSecs: number;
}): number {
  if (p.status === "Repaid") return 0;
  if (p.periodSecs <= 0 || p.now <= p.lastPaymentAt) return 0;
  return Math.floor((p.now - p.lastPaymentAt) / p.periodSecs);
}

/** missed > maxPausePeriods. */
export function isOverdue(missed: number, maxPausePeriods: number): boolean {
  return missed > maxPausePeriods;
}
