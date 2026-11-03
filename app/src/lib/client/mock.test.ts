import { beforeEach, describe, expect, it } from "vitest";
import config from "../config";
import { LayaError } from "../types";
import { toUnits } from "../units";
import { MockLayaClient, MOCK_STORAGE_KEY, type StorageLike } from "./mock";
import type { AccountRole } from "../roles";

const A = config.accounts;
const HASH = "ab".repeat(32);
const U = (s: string) => toUnits(s);

function memStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

let t = 1_000_000;
let storage: StorageLike;
let mock: MockLayaClient;

function make(search = "", store: StorageLike | null = storage) {
  return new MockLayaClient({
    now: () => t,
    delayMs: 0,
    storage: store,
    sessionStorage: memStorage(),
    search: () => search,
  });
}
const as = (role: AccountRole) => mock.setRole(role);

async function expectErr(p: Promise<unknown>, code: number, msg?: string) {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(LayaError);
    expect((e as LayaError).code).toBe(code);
    if (msg) expect((e as LayaError).message).toBe(msg);
    return;
  }
  throw new Error("expected LayaError " + code);
}

async function request(principal = "860", months = 12, shareBps = 1500) {
  as("worker");
  const { requestId } = await mock.requestPayoff({
    family: A.family,
    creditor: A.creditor,
    principal: U(principal),
    months,
    shareBps,
    docHash: HASH,
  });
  return requestId;
}
async function confirmed(...args: Parameters<typeof request>) {
  const id = await request(...args);
  as("creditor");
  await mock.confirmRequest(id);
  return id;
}
async function funded(mode: "Loan" | "Grant" = "Loan", feeBps = 300, ...args: Parameters<typeof request>) {
  const id = await confirmed(...args);
  as("funder");
  await mock.fundRequest({ requestId: id, mode, feeBps });
  return id;
}

beforeEach(() => {
  t = 1_000_000;
  storage = memStorage();
  mock = make();
});

describe("initial state", () => {
  it("has the creditor registered, balances and trustlines", async () => {
    expect(await mock.isCreditor(A.creditor)).toBe(true);
    expect(await mock.isCreditor(A.worker)).toBe(false);
    expect(await mock.getBalance(A.worker)).toBe(U("2000"));
    expect(await mock.getBalance(A.funder)).toBe(U("10000"));
    expect(await mock.getBalance(A.family)).toBe(0n);
    for (const a of [A.worker, A.family, A.funder, A.creditor]) expect(await mock.hasTrustline(a)).toBe(true);
    expect(await mock.hasTrustline(A.admin)).toBe(false);
    expect(await mock.getConfig()).toEqual({
      admin: A.admin,
      token: config.tokenContractId,
      periodSecs: 60,
      maxPausePeriods: 3,
    });
  });
  it("connects as the worker by default and follows ?role=", async () => {
    expect(await mock.connect()).toBe(A.worker);
    const m2 = make("?role=creditor");
    expect(m2.address()).toBe(A.creditor);
  });
});

describe("golden flow", () => {
  it("request 860 / 12 months / 15% -> 928.80; fund Loan 3% -> 956.664; remit 400", async () => {
    const id = await request();
    expect(id).toBe(1);
    const req = await mock.getRequest(1);
    expect(req.legalAmount).toBe(9_288_000_000n);
    expect(req.status).toBe("Open");
    expect(req.confirmedAt).toBe(0);
    expect(req.docHash).toBe(HASH);

    as("creditor");
    t += 5;
    await mock.confirmRequest(1);
    expect((await mock.getRequest(1)).status).toBe("Confirmed");
    expect((await mock.getRequest(1)).confirmedAt).toBe(t);

    as("funder");
    const f = await mock.fundRequest({ requestId: 1, mode: "Loan", feeBps: 300 });
    expect(f.loanId).toBe(1);
    expect(f.txHash).toMatch(/^[0-9a-f]{64}$/);
    const loan = await mock.getLoan(1);
    expect(loan.outstanding).toBe(9_566_640_000n);
    expect(loan.status).toBe("Active");
    expect(loan.minShareBps).toBe(1500);
    expect(loan.fundedAt).toBe(t);
    expect(await mock.getBalance(A.creditor)).toBe(9_288_000_000n);
    expect(await mock.getBalance(A.funder)).toBe(U("10000") - 9_288_000_000n);

    as("worker");
    const r = await mock.remit({ loanId: 1, amount: U("400") });
    expect(r.toLender).toBe(600_000_000n);
    expect(r.toFamily).toBe(3_400_000_000n);
    expect(r.outstanding).toBe(8_966_640_000n);
    expect(await mock.getBalance(A.family)).toBe(3_400_000_000n);
    expect(await mock.getBalance(A.worker)).toBe(U("2000") - U("400"));
    const after = await mock.getLoan(1);
    expect(after.totalRepaid).toBe(600_000_000n);
    expect(after.totalToFamily).toBe(3_400_000_000n);
    expect(after.remitCount).toBe(1);
  });

  it("final remit repays the loan", async () => {
    const id = await funded("Loan", 0, "10", 1, 1500); // outstanding 100_666_666
    const before = await mock.getLoan(id);
    expect(before.outstanding).toBe(100_666_666n);
    t += 100;
    as("worker");
    const r = await mock.remit({ loanId: id, amount: U("400") });
    expect(r.toLender).toBe(100_666_666n);
    expect(r.toFamily).toBe(U("400") - 100_666_666n);
    expect(r.outstanding).toBe(0n);
    const l = await mock.getLoan(id);
    expect(l.status).toBe("Repaid");
    expect(l.lastPaymentAt).toBe(t); // becoming Repaid resets the clock
    const types = (await mock.getEvents(id)).map((e) => e.type);
    expect(types.slice(-2)).toEqual(["remit", "repaid"]);
  });

  it("Grant mode: nothing owed, everything goes to family", async () => {
    const id = await funded("Grant", 0);
    const l = await mock.getLoan(id);
    expect(l.outstanding).toBe(0n);
    expect(l.status).toBe("Repaid");
    as("worker");
    const r = await mock.remit({ loanId: id, amount: U("400") });
    expect(r.toLender).toBe(0n);
    expect(r.toFamily).toBe(4_000_000_000n);
    expect(await mock.getBalance(A.funder)).toBe(U("10000") - 9_288_000_000n); // no repayment received
  });
});

describe("pause clock", () => {
  it("dust remit doesn't reset the clock", async () => {
    const id = await funded();
    const fundedAt = (await mock.getLoan(id)).fundedAt;
    t += 30;
    as("worker");
    const r = await mock.remit({ loanId: id, amount: U("5") });
    expect(r.toLender).toBe(7_500_000n);
    expect((await mock.getLoan(id)).lastPaymentAt).toBe(fundedAt);
    t += 30; // 60 s after funding
    expect((await mock.getLoan(id)).missedPeriods).toBe(1);
  });

  it("a remit paying >= 1 USDC resets the clock", async () => {
    const id = await funded();
    t += 120;
    as("worker");
    await mock.remit({ loanId: id, amount: U("400") });
    const l = await mock.getLoan(id);
    expect(l.lastPaymentAt).toBe(t);
    expect(l.missedPeriods).toBe(0);
  });

  it("1 missed period after 60 s; overdue only after more than 3", async () => {
    const id = await funded();
    expect((await mock.getLoan(id)).missedPeriods).toBe(0);
    t += 59;
    expect((await mock.getLoan(id)).missedPeriods).toBe(0);
    t += 1;
    let l = await mock.getLoan(id);
    expect(l.missedPeriods).toBe(1);
    expect(l.isOverdue).toBe(false);
    t += 120; // 3 periods
    l = await mock.getLoan(id);
    expect(l.missedPeriods).toBe(3);
    expect(l.isOverdue).toBe(false);
    t += 60; // 4 periods
    l = await mock.getLoan(id);
    expect(l.missedPeriods).toBe(4);
    expect(l.isOverdue).toBe(true);
  });

  it("repaid loans have no missed periods", async () => {
    const id = await funded("Grant", 0);
    t += 10_000;
    expect((await mock.getLoan(id)).missedPeriods).toBe(0);
  });

  it("admin setPeriod changes the period", async () => {
    const id = await funded();
    as("admin");
    await mock.setPeriod({ periodSecs: 10, maxPausePeriods: 1 });
    t += 30;
    const l = await mock.getLoan(id);
    expect(l.missedPeriods).toBe(3);
    expect(l.isOverdue).toBe(true);
    await expectErr(mock.setPeriod({ periodSecs: 0, maxPausePeriods: 3 }), 11);
  });
});

describe("errors", () => {
  it("set_share below the floor -> 7", async () => {
    const id = await funded("Loan", 300, "860", 12, 1500);
    as("worker");
    await expectErr(mock.setShare({ loanId: id, shareBps: 1400 }), 7);
    await mock.setShare({ loanId: id, shareBps: 1500 });
  });
  it("set_share can be raised up to 15% and not above", async () => {
    const id = await funded("Loan", 300, "860", 12, 1000);
    as("worker");
    await mock.setShare({ loanId: id, shareBps: 1500 });
    expect((await mock.getLoan(id)).shareBps).toBe(1500);
    expect((await mock.getLoan(id)).minShareBps).toBe(1000);
    await expectErr(mock.setShare({ loanId: id, shareBps: 1501 }), 7);
    await mock.setShare({ loanId: id, shareBps: 1000 }); // back to the floor is allowed
  });
  it("fund an Open request -> 5", async () => {
    const id = await request();
    as("funder");
    await expectErr(mock.fundRequest({ requestId: id, mode: "Loan", feeBps: 300 }), 5);
  });
  it("fund twice -> 5", async () => {
    const id = await funded();
    as("funder");
    await expectErr(mock.fundRequest({ requestId: id, mode: "Loan", feeBps: 300 }), 5);
  });
  it("wrong signer -> code 0 with a friendly message", async () => {
    const id = await request();
    as("worker");
    await expectErr(mock.confirmRequest(id), 0, "Switch to the Creditor account to do this");
    as("creditor");
    await expectErr(mock.cancelRequest(id), 0, "Switch to the Worker account to do this");
    await expectErr(mock.addCreditor(A.family), 0, "Switch to the Admin account to do this");
    await mock.confirmRequest(id);
    as("funder");
    await mock.fundRequest({ requestId: id, mode: "Loan", feeBps: 300 });
    await expectErr(mock.remit({ loanId: id, amount: U("1") }), 0, "Switch to the Worker account to do this");
    await expectErr(mock.setShare({ loanId: id, shareBps: 1500 }), 0);
    as("worker");
    await expectErr(mock.setPeriod({ periodSecs: 60, maxPausePeriods: 3 }), 0, "Switch to the Admin account to do this");
  });
  it("request validation", async () => {
    as("worker");
    const base = { family: A.family, creditor: A.creditor, principal: U("860"), months: 12, shareBps: 1500, docHash: HASH };
    await expectErr(mock.requestPayoff({ ...base, creditor: A.funder }), 3);
    await expectErr(mock.requestPayoff({ ...base, principal: 0n }), 8);
    await expectErr(mock.requestPayoff({ ...base, principal: 1_000_000_000_000_001n }), 8);
    await expectErr(mock.requestPayoff({ ...base, months: 0 }), 9);
    await expectErr(mock.requestPayoff({ ...base, months: 61 }), 9);
    await expectErr(mock.requestPayoff({ ...base, shareBps: 99 }), 7);
    await expectErr(mock.requestPayoff({ ...base, shareBps: 1501 }), 7);
    await expectErr(mock.requestPayoff({ ...base, docHash: "xyz" }), 0);
    await mock.requestPayoff({ ...base, months: 60, shareBps: 100 });
    expect(await mock.listRequests()).toHaveLength(1); // failed calls changed nothing
  });
  it("fee rules -> 10", async () => {
    const id = await confirmed();
    as("funder");
    await expectErr(mock.fundRequest({ requestId: id, mode: "Loan", feeBps: 801 }), 10);
    await expectErr(mock.fundRequest({ requestId: id, mode: "Grant", feeBps: 100 }), 10);
    await mock.fundRequest({ requestId: id, mode: "Loan", feeBps: 800 });
  });
  it("not found -> 4 / 6", async () => {
    await expectErr(mock.getRequest(99), 4);
    await expectErr(mock.getLoan(99), 6);
    as("creditor");
    await expectErr(mock.confirmRequest(99), 4);
  });
  it("confirm twice -> 5; cancel after funded -> 5", async () => {
    const id = await confirmed();
    as("creditor");
    await expectErr(mock.confirmRequest(id), 5);
    as("worker");
    await mock.cancelRequest(id);
    expect((await mock.getRequest(id)).status).toBe("Cancelled");
    await expectErr(mock.cancelRequest(id), 5);
  });
  it("not enough test USDC -> 0, and nothing moves", async () => {
    const id = await funded();
    as("worker");
    await expectErr(mock.remit({ loanId: id, amount: U("2001") }), 0, "Not enough test USDC");
    expect(await mock.getBalance(A.worker)).toBe(U("2000"));
    expect((await mock.getLoan(id)).remitCount).toBe(0);
    await expectErr(mock.remit({ loanId: id, amount: 0n }), 8);
  });
  it("funder without enough USDC -> 0", async () => {
    const id = await confirmed("20000", 12);
    as("funder");
    await expectErr(mock.fundRequest({ requestId: id, mode: "Loan", feeBps: 0 }), 0, "Not enough test USDC");
    expect((await mock.getRequest(id)).status).toBe("Confirmed");
  });
});

describe("lists, events, admin", () => {
  it("lists newest first, loans only for funded requests", async () => {
    await funded();
    const id2 = await request("100", 6);
    const id3 = await confirmed("50", 3);
    expect((await mock.listRequests()).map((r) => r.id)).toEqual([id3, id2, 1]);
    expect((await mock.listLoans()).map((l) => l.id)).toEqual([1]);
    as("funder");
    await mock.fundRequest({ requestId: id3, mode: "Grant", feeBps: 0 });
    expect((await mock.listLoans()).map((l) => l.id)).toEqual([id3, 1]);
  });
  it("records events oldest first and filters by id", async () => {
    await funded();
    await request("100", 6);
    as("worker");
    await mock.remit({ loanId: 1, amount: U("400") });
    const all = await mock.getEvents();
    expect(all.map((e) => `${e.type}:${e.id}`)).toEqual([
      "request_created:1",
      "request_confirmed:1",
      "payoff:1",
      "request_created:2",
      "remit:1",
    ]);
    expect((await mock.getEvents(2)).map((e) => e.type)).toEqual(["request_created"]);
    expect(all[4].data).toEqual({ toLender: 600_000_000n, toFamily: 3_400_000_000n, outstanding: 8_966_640_000n });
  });
  it("admin can register a creditor", async () => {
    as("admin");
    await mock.addCreditor(A.family);
    expect(await mock.isCreditor(A.family)).toBe(true);
  });
});

describe("persistence", () => {
  it("another instance on the same storage sees the data (bigints survive)", async () => {
    await funded();
    const other = make("?role=funder");
    const loan = await other.getLoan(1);
    expect(loan.outstanding).toBe(9_566_640_000n);
    expect(typeof loan.legalAmount).toBe("bigint");
    expect(storage.getItem(MOCK_STORAGE_KEY)).toContain("$big");
  });
  it("?mockReset=1 wipes saved state; reset() too", async () => {
    await request();
    const fresh = make("?mockReset=1");
    expect(await fresh.listRequests()).toEqual([]);
    await fresh.setRole("worker");
    await fresh.requestPayoff({ family: A.family, creditor: A.creditor, principal: U("1"), months: 1, shareBps: 100, docHash: HASH });
    fresh.reset();
    expect(await fresh.listRequests()).toEqual([]);
  });
  it("works without storage (memory only) and with throwing storage", async () => {
    const broken: StorageLike = {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
      removeItem: () => { throw new Error("denied"); },
    };
    for (const st of [null, broken]) {
      const m = make("", st);
      await m.requestPayoff({ family: A.family, creditor: A.creditor, principal: U("1"), months: 1, shareBps: 100, docHash: HASH });
      expect(await m.listRequests()).toHaveLength(1);
    }
  });
  it("role is remembered per tab via session storage", async () => {
    const session = memStorage();
    const m1 = new MockLayaClient({ delayMs: 0, storage: storage, sessionStorage: session, search: () => "?role=funder" });
    expect(m1.address()).toBe(A.funder);
    const m2 = new MockLayaClient({ delayMs: 0, storage: storage, sessionStorage: session, search: () => "" });
    expect(m2.address()).toBe(A.funder);
  });
});
