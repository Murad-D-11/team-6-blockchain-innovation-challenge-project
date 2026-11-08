import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../config";
import { CONFIG_TTL_MS, RealLayaClient } from "./real";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getNetwork: vi.fn(),
  getAddress: vi.fn(),
}));

const ADDR = config.accounts.worker;
const ok = <T>(v: T) => ({ isErr: () => false, unwrap: () => v, unwrapErr: () => ({ message: "" }) });

// RequestStatus 0 Open, 1 Confirmed, 2 Funded, 3 Cancelled. LoanStatus 0 Active, 1 Repaid.
const rawRequest = (id: number, status: number) => ({
  id, worker: ADDR, family: ADDR, creditor: ADDR, principal: 100n, months: 3, legal_amount: 100n,
  share_bps: 1500, doc_hash: new Uint8Array(32), status, created_at: 1n, confirmed_at: 0n,
});
const rawLoan = (id: number, status: number) => ({
  id, worker: ADDR, family: ADDR, funder: ADDR, creditor: ADDR, mode: 0, legal_amount: 100n,
  fee_bps: 300, outstanding: status === 1 ? 0n : 50n, share_bps: 1500, min_share_bps: 1000,
  doc_hash: new Uint8Array(32), funded_at: 1n, last_payment_at: 1n, total_repaid: 0n,
  total_to_family: 0n, remit_count: 0, status,
});

/** A client whose contract is a fake that counts every read. */
function setup(statuses: number[], loanStatus = 0) {
  const calls = { get_config: 0, request_count: 0, get_request: 0, get_loan: 0 };
  const requestReads: number[] = [];
  const state = { statuses: [...statuses], loanStatus, delay: false };
  const later = async <T>(v: T) => {
    if (state.delay) await new Promise((r) => setTimeout(r, 10));
    return { result: v };
  };
  const fake = {
    get_config: () => { calls.get_config++; return later({ admin: ADDR, token: ADDR, period_secs: 100n, max_pause_periods: 2 }); },
    request_count: () => { calls.request_count++; return later(state.statuses.length); },
    get_request: ({ id }: { id: number }) => { calls.get_request++; requestReads.push(id); return later(ok(rawRequest(id, state.statuses[id - 1]))); },
    get_loan: ({ id }: { id: number }) => { calls.get_loan++; return later(ok(rawLoan(id, state.loanStatus))); },
    set_period: () => later(ok(undefined)),
  };
  const client = new RealLayaClient();
  vi.spyOn(client as unknown as { contract: () => unknown }, "contract").mockReturnValue(fake);
  return { client, calls, requestReads, state };
}

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(1_000_000_000_000); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("request cache", () => {
  it("a second listRequests re-reads only Open and Confirmed requests", async () => {
    // ids 1..4: Open, Confirmed, Funded, Cancelled
    const { client, calls, requestReads } = setup([0, 1, 2, 3]);
    const first = await client.listRequests();
    expect(first.map((r) => r.status)).toEqual(["Cancelled", "Funded", "Confirmed", "Open"]);
    expect(calls.get_request).toBe(4);

    requestReads.length = 0;
    const second = await client.listRequests();
    expect(second).toEqual(first);
    expect(calls.request_count).toBe(2); // the count is always read
    expect(requestReads.sort()).toEqual([1, 2]); // only Open and Confirmed
  });

  it("a request that becomes Funded is read once more, then cached", async () => {
    const { client, state, requestReads } = setup([1]);
    await client.listRequests();
    state.statuses[0] = 2;
    expect((await client.listRequests())[0].status).toBe("Funded");
    requestReads.length = 0;
    await client.listRequests();
    expect(requestReads).toEqual([]);
  });
});

describe("shared in-flight reads", () => {
  it("concurrent listRequests calls make one set of reads", async () => {
    const { client, calls, state } = setup([0, 1, 0]);
    state.delay = true;
    const [a, b] = await Promise.all([client.listRequests(), client.listRequests()]);
    expect(b).toBe(a);
    expect(calls.request_count).toBe(1);
    expect(calls.get_request).toBe(3);
  });

  it("listLoans alongside listRequests shares the request reads", async () => {
    const { client, calls, state } = setup([1, 2, 2]);
    state.delay = true;
    const [reqs, loans] = await Promise.all([client.listRequests(), client.listLoans()]);
    expect(reqs).toHaveLength(3);
    expect(loans).toHaveLength(2);
    expect(calls.request_count).toBe(1);
    expect(calls.get_request).toBe(3);
    expect(calls.get_config).toBe(1);
  });

  it("a call after the shared reads finished reads again", async () => {
    const { client, calls } = setup([0]);
    await client.listRequests();
    await client.listRequests();
    expect(calls.request_count).toBe(2);
  });
});

describe("config cache", () => {
  it("reads once within 30 s and again after the TTL", async () => {
    const { client, calls } = setup([]);
    await client.getConfig();
    vi.setSystemTime(Date.now() + CONFIG_TTL_MS - 1);
    await client.getConfig();
    expect(calls.get_config).toBe(1);
    vi.setSystemTime(Date.now() + 2);
    await client.getConfig();
    expect(calls.get_config).toBe(2);
  });

  it("is read again after setPeriod", async () => {
    const { client, calls } = setup([]);
    vi.spyOn(client as unknown as { write: () => unknown }, "write").mockResolvedValue({ value: undefined, txHash: "h" });
    await client.getConfig();
    await client.getConfig();
    expect(calls.get_config).toBe(1);
    await client.setPeriod({ periodSecs: 50, maxPausePeriods: 1 });
    await client.getConfig();
    expect(calls.get_config).toBe(2);
  });
});

describe("loans", () => {
  it("re-reads loans every call, including Repaid ones (remit and set_share still change them)", async () => {
    const { client, calls } = setup([2], 1);
    await client.listLoans();
    await client.listLoans();
    expect(calls.get_loan).toBe(2);
  });

  it("recomputes missedPeriods and overdue from the current time on every call", async () => {
    const { client } = setup([2], 0); // last payment at 1 s, period 100 s, max pause 2
    vi.setSystemTime(1_000 * 1000);
    const early = (await client.listLoans())[0];
    vi.setSystemTime(10_000 * 1000);
    const late = (await client.listLoans())[0];
    expect(late.missedPeriods).toBeGreaterThan(early.missedPeriods);
    expect(late.isOverdue).toBe(true);
    expect((await client.getLoan(1)).missedPeriods).toBe(late.missedPeriods);
  });
});
