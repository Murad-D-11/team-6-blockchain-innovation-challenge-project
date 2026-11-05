import config from "../config";
import { isValidAccount } from "../address";
import {
  MAX_FEE_BPS,
  MAX_MONTHS,
  MAX_PRINCIPAL,
  MAX_SHARE_BPS,
  MIN_MONTHS,
  MIN_SHARE_BPS,
  PAUSE_RESET_MIN,
  isOverdue,
  legalAmount,
  missedPeriods,
  outstandingFor,
  split,
} from "../formulas";
import { accountOf, isAccountRole, type AccountRole } from "../roles";
import {
  LayaError,
  type Config,
  type LayaClient,
  type LayaEvent,
  type Loan,
  type Mode,
  type PayoffRequest,
  type RemitResult,
  type TxResult,
} from "../types";
import { notifyAddressChanged } from "./wallet-events";

export const MOCK_STORAGE_KEY = "laya:mock:v2";
const ROLE_KEY = "laya:mock:role";
const ONE = 10_000_000n;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface MockOptions {
  /** Unix seconds. Tests inject this to move time. */
  now?: () => number;
  /** Artificial latency per call so pages show loading states. Default 300. */
  delayMs?: number;
  /** State storage. Default: window.localStorage when usable, else memory only. */
  storage?: StorageLike | null;
  /** Per-tab role storage. Default: window.sessionStorage when usable. */
  sessionStorage?: StorageLike | null;
  /** Returns the URL query string (for ?role= and ?mockReset=1). Default: window.location.search. */
  search?: () => string;
  /** Initial role when no ?role= and nothing remembered. Default "worker". */
  role?: AccountRole;
}

type StoredLoan = Omit<Loan, "missedPeriods" | "isOverdue">;

interface State {
  periodSecs: number;
  maxPausePeriods: number;
  creditors: string[];
  requests: PayoffRequest[];
  loans: StoredLoan[];
  balances: Record<string, bigint>;
  events: LayaEvent[];
  ledger: number;
}

const ROLE_LABEL: Record<AccountRole, string> = {
  worker: "Worker",
  family: "Family",
  funder: "Funder",
  creditor: "Creditor",
  admin: "Admin",
  employer: "Employer",
  clinic: "Clinic",
};

function initialState(): State {
  return {
    periodSecs: config.periodSecs,
    maxPausePeriods: config.maxPausePeriods,
    creditors: [config.accounts.creditor, config.accounts.clinic],
    requests: [],
    loans: [],
    balances: {
      [config.accounts.worker]: 2_000n * ONE,
      [config.accounts.funder]: 10_000n * ONE,
      [config.accounts.employer]: 10_000n * ONE,
    },
    events: [],
    ledger: 1_000,
  };
}

// bigints are stored as strings: {"$big":"123"}
function serialize(s: State): string {
  return JSON.stringify(s, (_k, v) => (typeof v === "bigint" ? { $big: v.toString() } : v));
}
function deserialize(raw: string): State {
  return JSON.parse(raw, (_k, v) =>
    v && typeof v === "object" && typeof v.$big === "string" ? BigInt(v.$big) : v,
  ) as State;
}

function safe<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

function defaultStorage(kind: "localStorage" | "sessionStorage"): StorageLike | null {
  if (typeof window === "undefined") return null;
  return safe(() => window[kind]) ?? null;
}

function randomHex(bytes: number): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export class MockLayaClient implements LayaClient {
  private readonly now: () => number;
  private readonly delayMs: number;
  private readonly storage: StorageLike | null;
  private readonly session: StorageLike | null;
  private readonly search: () => string;
  private memRole: AccountRole;
  /** Fallback copy of the state, used only when storage is unavailable. */
  private memState: string | null = null;

  constructor(opts: MockOptions = {}) {
    this.now = opts.now ?? (() => Math.floor(Date.now() / 1000));
    this.delayMs = opts.delayMs ?? 300;
    this.storage = opts.storage === undefined ? defaultStorage("localStorage") : opts.storage;
    this.session = opts.sessionStorage === undefined ? defaultStorage("sessionStorage") : opts.sessionStorage;
    this.search =
      opts.search ?? (() => (typeof window !== "undefined" ? safe(() => window.location.search) ?? "" : ""));
    this.memRole = opts.role ?? "worker";
    if (new URLSearchParams(this.search()).get("mockReset") === "1") this.reset();
  }

  // ---------- extras for /dev and tests (not part of LayaClient) ----------

  /** Wipe all saved mock state. */
  reset(): void {
    this.memState = null;
    safe(() => this.storage?.removeItem(MOCK_STORAGE_KEY));
  }

  /** Act as another role (remembered for this tab). A ?role= in the URL still wins. */
  setRole(role: AccountRole): void {
    this.memRole = role;
    safe(() => this.session?.setItem(ROLE_KEY, role));
    notifyAddressChanged();
  }

  role(): AccountRole {
    const fromUrl = safe(() => new URLSearchParams(this.search()).get("role"));
    if (isAccountRole(fromUrl)) {
      this.memRole = fromUrl;
      safe(() => this.session?.setItem(ROLE_KEY, fromUrl));
      return fromUrl;
    }
    const fromSession = safe(() => this.session?.getItem(ROLE_KEY));
    if (isAccountRole(fromSession)) return fromSession;
    return this.memRole;
  }

  // ---------- internals ----------

  private async wait(): Promise<void> {
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
  }

  private load(): State {
    let raw: string | null = null;
    let storageOk = this.storage !== null;
    if (this.storage) {
      try {
        raw = this.storage.getItem(MOCK_STORAGE_KEY);
      } catch {
        storageOk = false;
      }
    }
    if (!storageOk) raw = this.memState;
    if (raw) {
      try {
        return deserialize(raw);
      } catch {
        /* corrupt: start over */
      }
    }
    return initialState();
  }

  private save(s: State): void {
    const raw = serialize(s);
    this.memState = raw;
    safe(() => this.storage?.setItem(MOCK_STORAGE_KEY, raw));
  }

  /** Run a read: wait, load, compute. */
  private async read<T>(fn: (s: State) => T): Promise<T> {
    await this.wait();
    return fn(this.load());
  }

  /** Run a write: wait, load, mutate a private copy, save only if nothing threw. */
  private async write<T>(fn: (s: State, txHash: string) => T): Promise<T & TxResult> {
    await this.wait();
    const s = this.load();
    const txHash = randomHex(32);
    const out = fn(s, txHash);
    this.save(s);
    return { ...out, txHash };
  }

  private requireSigner(role: AccountRole, account: string): void {
    if (this.address() !== account) {
      throw new LayaError(0, `Switch to the ${ROLE_LABEL[role]} account to do this`);
    }
  }

  private transfer(s: State, from: string, to: string, amount: bigint): void {
    if (amount <= 0n) return;
    const bal = s.balances[from] ?? 0n;
    if (bal < amount) throw new LayaError(0, "Not enough test USDC");
    s.balances[from] = bal - amount;
    s.balances[to] = (s.balances[to] ?? 0n) + amount;
  }

  private emit(
    s: State,
    txHash: string,
    type: LayaEvent["type"],
    id: number,
    data: Record<string, unknown>,
  ): void {
    s.ledger += 1;
    s.events.push({ type, id, ledger: s.ledger, timestamp: this.now(), txHash, data });
  }

  private findRequest(s: State, id: number): PayoffRequest {
    const r = s.requests.find((x) => x.id === id);
    if (!r) throw new LayaError(4, "Request not found");
    return r;
  }

  private findLoan(s: State, id: number): StoredLoan {
    const l = s.loans.find((x) => x.id === id);
    if (!l) throw new LayaError(6, "Loan not found");
    return l;
  }

  private toLoan(s: State, l: StoredLoan): Loan {
    const missed = missedPeriods({
      status: l.status,
      now: this.now(),
      lastPaymentAt: l.lastPaymentAt,
      periodSecs: s.periodSecs,
    });
    return { ...l, missedPeriods: missed, isOverdue: isOverdue(missed, s.maxPausePeriods) };
  }

  // ---------- LayaClient ----------

  async connect(): Promise<string> {
    await this.wait();
    const addr = this.address();
    notifyAddressChanged();
    return addr;
  }

  /** Always returns an address in the mock (defaults to the worker). */
  address(): string {
    return accountOf(this.role());
  }

  async requestPayoff(p: {
    family: string;
    creditor: string;
    principal: bigint;
    months: number;
    shareBps: number;
    docHash: string;
  }): Promise<TxResult & { requestId: number }> {
    return this.write((s, tx) => {
      const worker = this.address(); // the connected account is the worker, so auth always holds
      if (!isValidAccount(p.family)) throw new LayaError(0, "Invalid family address");
      if (!/^[0-9a-fA-F]{64}$/.test(p.docHash)) throw new LayaError(0, "Invalid document fingerprint");
      if (!s.creditors.includes(p.creditor)) throw new LayaError(3, "Creditor is not registered");
      if (p.principal <= 0n || p.principal > MAX_PRINCIPAL) throw new LayaError(8, "Invalid amount");
      if (!Number.isInteger(p.months) || p.months < MIN_MONTHS || p.months > MAX_MONTHS)
        throw new LayaError(9, "Months must be between 1 and 60");
      if (!Number.isInteger(p.shareBps) || p.shareBps < MIN_SHARE_BPS || p.shareBps > MAX_SHARE_BPS)
        throw new LayaError(7, "Share must be between 1% and 15%");

      const id = s.requests.length + 1;
      const legal = legalAmount(p.principal, p.months);
      s.requests.push({
        id,
        worker,
        family: p.family,
        creditor: p.creditor,
        principal: p.principal,
        months: p.months,
        legalAmount: legal,
        shareBps: p.shareBps,
        docHash: p.docHash.toLowerCase(),
        status: "Open",
        createdAt: this.now(),
        confirmedAt: 0,
      });
      this.emit(s, tx, "request_created", id, { worker, creditor: p.creditor, legalAmount: legal });
      return { requestId: id };
    });
  }

  async cancelRequest(requestId: number): Promise<TxResult> {
    return this.write((s) => {
      const r = this.findRequest(s, requestId);
      this.requireSigner("worker", r.worker);
      if (r.status !== "Open" && r.status !== "Confirmed")
        throw new LayaError(5, "Request can't be cancelled in its current status");
      r.status = "Cancelled";
      return {};
    });
  }

  async confirmRequest(requestId: number): Promise<TxResult> {
    return this.write((s, tx) => {
      const r = this.findRequest(s, requestId);
      this.requireSigner("creditor", r.creditor);
      if (r.status !== "Open") throw new LayaError(5, "Request is not Open");
      r.status = "Confirmed";
      r.confirmedAt = this.now();
      this.emit(s, tx, "request_confirmed", r.id, { creditor: r.creditor });
      return {};
    });
  }

  async fundRequest(p: {
    requestId: number;
    mode: Mode;
    feeBps: number;
  }): Promise<TxResult & { loanId: number }> {
    return this.write((s, tx) => {
      const funder = this.address(); // the connected account is the funder
      const r = this.findRequest(s, p.requestId);
      if (r.status !== "Confirmed") throw new LayaError(5, "Request is not Confirmed");
      if (p.mode !== "Loan" && p.mode !== "Grant") throw new LayaError(0, "Unknown funding mode");
      if (!Number.isInteger(p.feeBps)) throw new LayaError(10, "Invalid fee");
      if (p.mode === "Loan" && (p.feeBps < 0 || p.feeBps > MAX_FEE_BPS)) throw new LayaError(10, "Invalid fee");
      if (p.mode === "Grant" && p.feeBps !== 0) throw new LayaError(10, "A grant has no fee");

      this.transfer(s, funder, r.creditor, r.legalAmount);

      const now = this.now();
      const outstanding = outstandingFor(r.legalAmount, p.mode, p.feeBps);
      s.loans.push({
        id: r.id,
        worker: r.worker,
        family: r.family,
        funder,
        creditor: r.creditor,
        mode: p.mode,
        legalAmount: r.legalAmount,
        feeBps: p.feeBps,
        outstanding,
        shareBps: r.shareBps,
        minShareBps: r.shareBps,
        docHash: r.docHash,
        fundedAt: now,
        lastPaymentAt: now,
        totalRepaid: 0n,
        totalToFamily: 0n,
        remitCount: 0,
        status: p.mode === "Grant" ? "Repaid" : "Active",
      });
      r.status = "Funded";
      this.emit(s, tx, "payoff", r.id, {
        funder,
        creditor: r.creditor,
        amount: r.legalAmount,
        mode: p.mode,
      });
      return { loanId: r.id };
    });
  }

  async remit(p: { loanId: number; amount: bigint }): Promise<RemitResult> {
    return this.write((s, tx) => {
      const l = this.findLoan(s, p.loanId);
      this.requireSigner("worker", l.worker);
      if (p.amount <= 0n) throw new LayaError(8, "Invalid amount");

      const r = split(p.amount, l.shareBps, l.outstanding);
      const bal = s.balances[l.worker] ?? 0n;
      if (bal < p.amount) throw new LayaError(0, "Not enough test USDC");
      this.transfer(s, l.worker, l.funder, r.toLender);
      this.transfer(s, l.worker, l.family, r.toFamily);

      const wasActive = l.status === "Active";
      l.outstanding = r.outstanding;
      l.totalRepaid += r.toLender;
      l.totalToFamily += r.toFamily;
      l.remitCount += 1;
      const justRepaid = wasActive && l.outstanding === 0n;
      if (justRepaid) l.status = "Repaid";
      if (r.toLender >= PAUSE_RESET_MIN || justRepaid) l.lastPaymentAt = this.now();

      this.emit(s, tx, "remit", l.id, {
        toLender: r.toLender,
        toFamily: r.toFamily,
        outstanding: r.outstanding,
      });
      if (justRepaid) this.emit(s, tx, "repaid", l.id, {});
      return { toLender: r.toLender, toFamily: r.toFamily, outstanding: r.outstanding };
    });
  }

  async setShare(p: { loanId: number; shareBps: number }): Promise<TxResult> {
    return this.write((s) => {
      const l = this.findLoan(s, p.loanId);
      this.requireSigner("worker", l.worker);
      if (!Number.isInteger(p.shareBps) || p.shareBps < l.minShareBps || p.shareBps > MAX_SHARE_BPS)
        throw new LayaError(7, "Share can't go below the share agreed at funding");
      l.shareBps = p.shareBps;
      return {};
    });
  }

  async addCreditor(address: string): Promise<TxResult> {
    return this.write((s) => {
      this.requireSigner("admin", config.accounts.admin);
      if (!isValidAccount(address)) throw new LayaError(0, "Invalid account address");
      if (!s.creditors.includes(address)) s.creditors.push(address);
      return {};
    });
  }

  async setPeriod(p: { periodSecs: number; maxPausePeriods: number }): Promise<TxResult> {
    return this.write((s) => {
      this.requireSigner("admin", config.accounts.admin);
      if (!Number.isInteger(p.periodSecs) || p.periodSecs <= 0) throw new LayaError(11, "Period must be above 0");
      if (!Number.isInteger(p.maxPausePeriods) || p.maxPausePeriods < 0)
        throw new LayaError(0, "Invalid max pause periods");
      s.periodSecs = p.periodSecs;
      s.maxPausePeriods = p.maxPausePeriods;
      return {};
    });
  }

  async getConfig(): Promise<Config> {
    return this.read((s) => ({
      admin: config.accounts.admin,
      token: config.tokenContractId,
      periodSecs: s.periodSecs,
      maxPausePeriods: s.maxPausePeriods,
    }));
  }

  async listRequests(): Promise<PayoffRequest[]> {
    return this.read((s) => [...s.requests].reverse());
  }

  async getRequest(id: number): Promise<PayoffRequest> {
    return this.read((s) => this.findRequest(s, id));
  }

  async listLoans(): Promise<Loan[]> {
    return this.read((s) => [...s.loans].reverse().map((l) => this.toLoan(s, l)));
  }

  async getLoan(id: number): Promise<Loan> {
    return this.read((s) => this.toLoan(s, this.findLoan(s, id)));
  }

  async isCreditor(address: string): Promise<boolean> {
    return this.read((s) => s.creditors.includes(address));
  }

  async hasTrustline(address: string): Promise<boolean> {
    await this.wait();
    const a = config.accounts;
    return [a.worker, a.family, a.funder, a.creditor, a.clinic, a.employer].includes(address);
  }

  async getBalance(address: string): Promise<bigint> {
    return this.read((s) => s.balances[address] ?? 0n);
  }

  async getEvents(id?: number): Promise<LayaEvent[]> {
    return this.read((s) => s.events.filter((e) => id === undefined || e.id === id));
  }
}
