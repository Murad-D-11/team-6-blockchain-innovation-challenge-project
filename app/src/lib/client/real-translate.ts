/**
 * Pure translation between the Soroban contract's formats (laya-bindings) and the app's formats
 * (types.ts). No network, no SDK calls: unit-testable. Used only by real.ts.
 *
 * Only `import type` from the bindings here, so nothing from them lands in this file's runtime.
 */
import type {
  Config as ContractConfig,
  Loan as ContractLoan,
  PayoffRequest as ContractRequest,
  RemitResult as ContractRemitResult,
} from "laya-bindings";
import { friendlyMessage } from "../errors";
import { isOverdue, missedPeriods } from "../formulas";
import {
  LayaError,
  type Config,
  type Loan,
  type PayoffRequest,
  type RemitResult,
} from "../types";
import {
  bytesToHex,
  hexToBytes,
  loanStatusFromNumber,
  modeFromNumber,
  modeToNumber,
  parseContractError,
  requestStatusFromNumber,
  u64ToNumber,
} from "./translate";

export { bytesToHex, hexToBytes, modeToNumber };

/** Contract error names by code (the order of the contract's Error enum). */
export const CONTRACT_ERROR_NAMES: Readonly<Record<string, number>> = {
  AlreadyInitialized: 1,
  NotInitialized: 2,
  CreditorNotRegistered: 3,
  RequestNotFound: 4,
  InvalidRequestStatus: 5,
  LoanNotFound: 6,
  InvalidShare: 7,
  InvalidAmount: 8,
  InvalidMonths: 9,
  InvalidFee: 10,
  InvalidPeriod: 11,
};

/** A contract error code 1-11 as a LayaError with the friendly message. Anything else is code 0. */
export function layaErrorFromCode(code: number): LayaError {
  const known = Number.isInteger(code) && code >= 1 && code <= 11;
  return new LayaError(known ? code : 0, friendlyMessage(known ? code : 0));
}

/** The `{ message }` object the bindings give for an `Err` (for example `{ message: "InvalidShare" }`). */
export function layaErrorFromContract(err: { message: string }): LayaError {
  return layaErrorFromCode(CONTRACT_ERROR_NAMES[err.message] ?? 0);
}

export function configFromContract(c: ContractConfig): Config {
  return {
    admin: c.admin,
    token: c.token,
    periodSecs: u64ToNumber(c.period_secs),
    maxPausePeriods: c.max_pause_periods,
  };
}

export function requestFromContract(c: ContractRequest): PayoffRequest {
  return {
    id: c.id,
    worker: c.worker,
    family: c.family,
    creditor: c.creditor,
    principal: c.principal,
    months: c.months,
    legalAmount: c.legal_amount,
    shareBps: c.share_bps,
    docHash: bytesToHex(c.doc_hash),
    status: requestStatusFromNumber(c.status),
    createdAt: u64ToNumber(c.created_at),
    confirmedAt: u64ToNumber(c.confirmed_at),
  };
}

/** `periodSecs` and `maxPausePeriods` come from the config; `now` is unix seconds. */
export function loanFromContract(
  c: ContractLoan,
  cfg: { periodSecs: number; maxPausePeriods: number },
  now: number,
): Loan {
  const status = loanStatusFromNumber(c.status);
  const lastPaymentAt = u64ToNumber(c.last_payment_at);
  const missed = missedPeriods({ status, now, lastPaymentAt, periodSecs: cfg.periodSecs });
  return {
    id: c.id,
    worker: c.worker,
    family: c.family,
    funder: c.funder,
    creditor: c.creditor,
    mode: modeFromNumber(c.mode),
    legalAmount: c.legal_amount,
    feeBps: c.fee_bps,
    outstanding: c.outstanding,
    shareBps: c.share_bps,
    minShareBps: c.min_share_bps,
    docHash: bytesToHex(c.doc_hash),
    fundedAt: u64ToNumber(c.funded_at),
    lastPaymentAt,
    totalRepaid: c.total_repaid,
    totalToFamily: c.total_to_family,
    remitCount: c.remit_count,
    status,
    missedPeriods: missed,
    isOverdue: isOverdue(missed, cfg.maxPausePeriods),
  };
}

export function remitResultFromContract(c: ContractRemitResult, txHash: string): RemitResult {
  return { txHash, toLender: c.to_lender, toFamily: c.to_family, outstanding: c.outstanding };
}

export const TOKEN_FAILURE_MESSAGE =
  "Not enough USDC in this account, or the account has no USDC trustline. Check the balance and try again.";

/**
 * The contract that first raised the error, read from the host's "Event log (newest first)". Each
 * line looks like `2: [Failed Diagnostic Event (not emitted)] contract:C..., topics:[error, Error(Contract, #10)]`.
 * The origin is the oldest event (highest index) that carries an error. Null when there is no log.
 */
export function errorOriginContract(text: string): string | null {
  const re = /^\s*(\d+): \[[^\]]*\] contract:(C[A-Z0-9]+), topics:\[error, Error\(/gm;
  let best: { n: number; id: string } | null = null;
  for (const m of text.matchAll(re)) {
    const n = Number(m[1]);
    if (!best || n > best.n) best = { n, id: m[2] };
  }
  return best ? best.id : null;
}

/**
 * Any thrown failure to a LayaError. A LayaError (for example the wallet's "Signing was rejected")
 * passes through. `Error(Contract, #n)` with n in 1-11 becomes that code, unless the token contract
 * raised it (see errorOriginContract): its own error numbers (such as 10, insufficient balance) overlap ours. Everything
 * else (network, wallet, simulation crash) is code 0.
 */
export function layaErrorFromUnknown(e: unknown, tokenContractId?: string): LayaError {
  if (e instanceof LayaError) return e;
  const text = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  if (tokenContractId && /Error\(Contract, #\d+\)/.test(text)) {
    const origin = errorOriginContract(text);
    // With an event log, the contract that raised the error decides (a laya error can mention the
    // token in its log). Without one, fall back to "the text names the token".
    if (origin ? origin === tokenContractId : text.includes(tokenContractId)) {
      return new LayaError(0, TOKEN_FAILURE_MESSAGE);
    }
  }
  return parseContractError(e);
}
