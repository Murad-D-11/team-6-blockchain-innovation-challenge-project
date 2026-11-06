import { describe, expect, it } from "vitest";
import {
  Error as ContractErrors,
  LoanStatus as CLoanStatus,
  Mode as CMode,
  RequestStatus as CRequestStatus,
  type Loan as ContractLoan,
  type PayoffRequest as ContractRequest,
} from "laya-bindings";
import { ERROR_MESSAGES } from "../errors";
import { LayaError } from "../types";
import {
  CONTRACT_ERROR_NAMES,
  TOKEN_FAILURE_MESSAGE,
  bytesToHex,
  configFromContract,
  hexToBytes,
  layaErrorFromCode,
  layaErrorFromContract,
  layaErrorFromUnknown,
  loanFromContract,
  modeToNumber,
  remitResultFromContract,
  requestFromContract,
} from "./real-translate";

const W = "GBRFS7NFREUTEIWTWZ3XZ3QCQYLFKG56OUK5ANFQCGWFUX4QALX3WVRF";
const F = "GBH54FIPD27XPI4GQSJDGP7OH2QRULUK77FRDVFUFVGR3SSTGDG3OWZ7";
const L = "GAY77PWODNPMFNTNZWGYRAXILHB427QB7CSLKNLBQRHQ7KSO75I7RWCZ";
const C = "GDUNEIGUPTDLOXG7GPZHYDJL65IWGHJX6BXIXPWOI3T6LYRZJSCOJBQL";
const HEX = "00ff10ab".repeat(8);
const BYTES = Uint8Array.from(Buffer.from(HEX, "hex"));

const contractRequest = (over: Partial<ContractRequest> = {}): ContractRequest => ({
  id: 3, worker: W, family: F, creditor: C,
  principal: 1_900_000_000n, months: 12, legal_amount: 1_900_000_000n, share_bps: 1500,
  doc_hash: BYTES, status: CRequestStatus.Confirmed,
  created_at: 1_790_000_000n, confirmed_at: 1_790_000_100n, ...over,
});

const contractLoan = (over: Partial<ContractLoan> = {}): ContractLoan => ({
  id: 3, worker: W, family: F, funder: L, creditor: C,
  mode: CMode.Loan, legal_amount: 1_900_000_000n, fee_bps: 300, outstanding: 1_357_000_000n,
  share_bps: 1500, min_share_bps: 1500, doc_hash: BYTES,
  funded_at: 1_790_000_200n, last_payment_at: 1_790_000_300n,
  total_repaid: 600_000_000n, total_to_family: 3_400_000_000n, remit_count: 1,
  status: CLoanStatus.Active, ...over,
});

describe("enums", () => {
  it("RequestStatus 0..3 and Mode / LoanStatus 0..1 map to the app strings", () => {
    const statuses = [0, 1, 2, 3].map((n) => requestFromContract(contractRequest({ status: n as CRequestStatus })).status);
    expect(statuses).toEqual(["Open", "Confirmed", "Funded", "Cancelled"]);
    const loan = (mode: number, status: number) =>
      loanFromContract(contractLoan({ mode: mode as CMode, status: status as CLoanStatus }), { periodSecs: 60, maxPausePeriods: 3 }, 1_790_000_300);
    expect(loan(0, 0)).toMatchObject({ mode: "Loan", status: "Active" });
    expect(loan(1, 1)).toMatchObject({ mode: "Grant", status: "Repaid" });
  });
  it("Mode maps back to the number", () => {
    expect(modeToNumber("Loan")).toBe(0);
    expect(modeToNumber("Grant")).toBe(1);
  });
  it("unknown numbers throw", () => {
    expect(() => requestFromContract(contractRequest({ status: 9 as CRequestStatus }))).toThrow();
  });
});

describe("doc_hash", () => {
  it("round trips bytes <-> 64 lowercase hex chars", () => {
    expect(bytesToHex(BYTES)).toBe(HEX);
    expect(new Uint8Array(hexToBytes(HEX))).toEqual(BYTES);
    expect(bytesToHex(new Uint8Array(hexToBytes(HEX.toUpperCase())))).toBe(HEX);
  });
  it("rejects wrong lengths, 0x and non-hex", () => {
    expect(() => hexToBytes("ab")).toThrow();
    expect(() => hexToBytes("0x" + HEX.slice(2))).toThrow();
    expect(() => hexToBytes("z".repeat(64))).toThrow();
    expect(() => bytesToHex(new Uint8Array(31))).toThrow();
  });
});

describe("config", () => {
  it("period_secs bigint becomes number and fields are camelCase", () => {
    expect(configFromContract({ admin: W, token: C, period_secs: 60n, max_pause_periods: 3 }))
      .toEqual({ admin: W, token: C, periodSecs: 60, maxPausePeriods: 3 });
  });
});

describe("PayoffRequest", () => {
  it("fixture end to end", () => {
    expect(requestFromContract(contractRequest())).toEqual({
      id: 3, worker: W, family: F, creditor: C,
      principal: 1_900_000_000n, months: 12, legalAmount: 1_900_000_000n, shareBps: 1500,
      docHash: HEX, status: "Confirmed", createdAt: 1_790_000_000, confirmedAt: 1_790_000_100,
    });
  });
  it("u64 timestamps become numbers; 0 stays 0", () => {
    const r = requestFromContract(contractRequest({ confirmed_at: 0n }));
    expect(r.createdAt).toBe(1_790_000_000);
    expect(typeof r.createdAt).toBe("number");
    expect(r.confirmedAt).toBe(0);
  });
  it("a timestamp beyond the safe range throws", () => {
    expect(() => requestFromContract(contractRequest({ created_at: 2n ** 63n }))).toThrow();
  });
});

describe("Loan", () => {
  const cfg = { periodSecs: 60, maxPausePeriods: 3 };
  it("fixture end to end, on time", () => {
    expect(loanFromContract(contractLoan(), cfg, 1_790_000_300 + 59)).toEqual({
      id: 3, worker: W, family: F, funder: L, creditor: C,
      mode: "Loan", legalAmount: 1_900_000_000n, feeBps: 300, outstanding: 1_357_000_000n,
      shareBps: 1500, minShareBps: 1500, docHash: HEX,
      fundedAt: 1_790_000_200, lastPaymentAt: 1_790_000_300,
      totalRepaid: 600_000_000n, totalToFamily: 3_400_000_000n, remitCount: 1, status: "Active",
      missedPeriods: 0, isOverdue: false,
    });
  });
  it("missedPeriods = floor((now - last) / period); overdue only above maxPausePeriods", () => {
    const at = (secs: number) => loanFromContract(contractLoan(), cfg, 1_790_000_300 + secs);
    expect(at(180)).toMatchObject({ missedPeriods: 3, isOverdue: false });
    expect(at(240)).toMatchObject({ missedPeriods: 4, isOverdue: true });
  });
  it("a Repaid loan is never missed or overdue", () => {
    const l = loanFromContract(contractLoan({ status: CLoanStatus.Repaid, outstanding: 0n }), cfg, 1_790_000_300 + 10_000);
    expect(l).toMatchObject({ status: "Repaid", missedPeriods: 0, isOverdue: false });
  });
});

describe("RemitResult", () => {
  it("golden: 600_000_000 / 3_400_000_000 / 1_357_000_000", () => {
    expect(remitResultFromContract({ to_lender: 600_000_000n, to_family: 3_400_000_000n, outstanding: 1_357_000_000n }, "abc"))
      .toEqual({ txHash: "abc", toLender: 600_000_000n, toFamily: 3_400_000_000n, outstanding: 1_357_000_000n });
  });
});

describe("contract errors", () => {
  it.each(Array.from({ length: 11 }, (_, i) => i + 1))("code %i maps to LayaError with that code and a friendly message", (code) => {
    const e = layaErrorFromCode(code);
    expect(e).toBeInstanceOf(LayaError);
    expect(e.code).toBe(code);
    expect(e.message).toBe(ERROR_MESSAGES[code]);
    expect(e.message.length).toBeGreaterThan(0);
  });
  it("the bindings' Error names map to the same codes (guards against a contract change)", () => {
    for (const [code, { message }] of Object.entries(ContractErrors)) {
      expect(CONTRACT_ERROR_NAMES[message]).toBe(Number(code));
      expect(layaErrorFromContract({ message }).code).toBe(Number(code));
    }
    expect(Object.keys(ContractErrors)).toHaveLength(Object.keys(CONTRACT_ERROR_NAMES).length);
  });
  it("unknown names and out-of-range codes become code 0", () => {
    expect(layaErrorFromContract({ message: "Nope" })).toMatchObject({ code: 0 });
    expect(layaErrorFromCode(12).code).toBe(0);
    expect(layaErrorFromCode(0).code).toBe(0);
  });
});

describe("layaErrorFromUnknown", () => {
  const TOKEN = "CAWWECWMEOJJE25IYYSDIOYTWCOW2R7S5NDGQISERK2U7GKI2UZYPEIW";
  it("passes a LayaError through (wallet rejection keeps its text)", () => {
    const e = new LayaError(0, "Signing was rejected in Freighter");
    expect(layaErrorFromUnknown(e)).toBe(e);
  });
  it("reads Error(Contract, #n) from a simulation failure", () => {
    const e = new Error('Transaction simulation failed: "HostError: Error(Contract, #5)"');
    expect(layaErrorFromUnknown(e, TOKEN)).toMatchObject({ code: 5, message: ERROR_MESSAGES[5] });
  });
  it("a token-contract error with an overlapping number is not mistaken for ours", () => {
    const e = new Error(`HostError: Error(Contract, #10) contract:${TOKEN} balance is not sufficient`);
    expect(layaErrorFromUnknown(e, TOKEN)).toMatchObject({ code: 0, message: TOKEN_FAILURE_MESSAGE });
  });
  it("network and other failures are code 0 with the friendly text", () => {
    expect(layaErrorFromUnknown(new Error("fetch failed"))).toMatchObject({ code: 0, message: ERROR_MESSAGES[0] });
    expect(layaErrorFromUnknown("boom")).toMatchObject({ code: 0 });
    expect(layaErrorFromUnknown(undefined)).toMatchObject({ code: 0 });
  });
});
