import { Client as LayaContract, type Mode as ContractMode } from "laya-bindings";
import type { AssembledTransaction, Result } from "@stellar/stellar-sdk/contract";
import { Server as RpcServer } from "@stellar/stellar-sdk/rpc";
import { isValidAccount } from "../address";
import config from "../config";
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
import { getUsdcBalance, hasUsdcTrustline } from "./horizon";
import { notifyAddressChanged } from "./wallet-events";
import { FreighterSigner } from "./freighter-signer";
import type { Signer } from "./signer";
import {
  configFromContract,
  eventFromContract,
  hexToBytes,
  layaErrorFromContract,
  layaErrorFromUnknown,
  loanFromContract,
  modeToNumber,
  remitResultFromContract,
  requestFromContract,
} from "./real-translate";

type ContractErr = { message: string };
type Call<T> = (c: LayaContract) => Promise<AssembledTransaction<T>>;

/** Ok value, or throws the LayaError for the contract's Err. */
function unwrap<T>(r: Result<T, ContractErr>): T {
  if (r.isErr()) throw layaErrorFromContract(r.unwrapErr());
  return r.unwrap();
}

function assertAccount(addr: string): void {
  if (!isValidAccount(addr)) throw new LayaError(0, "That is not a valid Stellar address.");
}

/** Ledgers (about 5 s each) to start inside the RPC's event range. */
const EVENTS_START_MARGIN = 100;

/** Pages to follow at most: a 7-day window is about 13 pages of 10,000 ledgers. */
const EVENTS_MAX_PAGES = 40;

/** The ledger a getEvents cursor points at (the cursor is a TOID, ledger in the high 32 bits). */
function cursorLedger(cursor: string): number {
  try {
    return Number(BigInt(cursor.split("-")[0]) >> 32n);
  } catch {
    return Number.MAX_SAFE_INTEGER; // unreadable cursor: stop rather than loop
  }
}

const nowSecs = () => Math.floor(Date.now() / 1000);

/** How long a read config is reused (ms). setPeriod clears it. */
export const CONFIG_TTL_MS = 30_000;

/** Contract: a Funded or Cancelled request is never written again (confirm needs Open, fund needs Confirmed, cancel needs Open or Confirmed). */
const isTerminalRequest = (r: PayoffRequest) => r.status === "Funded" || r.status === "Cancelled";

/**
 * LayaClient against the deployed contract. Writes are simulated first (a contract Err is thrown
 * before the wallet is asked to sign), then signed by the injected Signer and sent. Reads use the
 * simulation result and never sign. Every failure is a LayaError.
 */
export class RealLayaClient implements LayaClient {
  private addr: string | null = null;
  private readonly signer: Signer;
  /** Funded and Cancelled requests, which can never change. Per client instance. */
  private readonly finalRequests = new Map<number, PayoffRequest>();
  private cfgCache: { value: Config; at: number } | null = null;
  private cfgInflight: Promise<Config> | null = null;
  /** Bumped when the config changes, so a read that started earlier cannot refill the cache. */
  private cfgGen = 0;
  private listInflight: Promise<PayoffRequest[]> | null = null;
  /** Default signer: Freighter. */
  constructor(opts: { signer?: Signer } = {}) {
    this.signer = opts.signer ?? new FreighterSigner();
  }
  async connect(): Promise<string> {
    this.addr = await this.signer.address();
    notifyAddressChanged();
    return this.addr;
  }
  address(): string | null { return this.addr; }

  /** Bindings client for `publicKey`. Our Signer wrapped into the SDK's SignTransaction shape. */
  private contract(publicKey: string): LayaContract {
    return new LayaContract({
      contractId: config.contractId,
      rpcUrl: config.rpcUrl,
      networkPassphrase: config.networkPassphrase,
      publicKey,
      signTransaction: async (xdr, opts) => ({
        signedTxXdr: await this.signer.signTransaction(xdr, {
          networkPassphrase: opts?.networkPassphrase ?? config.networkPassphrase,
        }),
        signerAddress: publicKey,
      }),
    });
  }

  /** Simulation only. Without a connected wallet the admin account is just the simulation's source. */
  private async read<T>(call: Call<T>): Promise<T> {
    try {
      const tx = await call(this.contract(this.addr ?? config.accounts.admin));
      return tx.result;
    } catch (e) {
      throw layaErrorFromUnknown(e, config.tokenContractId);
    }
  }

  private async readOk<T>(call: Call<Result<T, ContractErr>>): Promise<T> {
    try {
      return unwrap(await this.read(call));
    } catch (e) {
      throw layaErrorFromUnknown(e, config.tokenContractId);
    }
  }

  /** Simulate, refuse on a contract Err without signing, else sign, send and read the Result. */
  private async write<T>(
    call: (c: LayaContract, who: string) => Promise<AssembledTransaction<Result<T, ContractErr>>>,
  ): Promise<{ value: T; txHash: string }> {
    try {
      const who = this.addr ?? (await this.connect());
      const tx = await call(this.contract(who), who);
      // The bindings turn a trapped simulation (e.g. the token's failed transfer) into an Err with an
      // empty message, which loses which contract failed. The raw simulation text keeps it.
      const sim = tx.simulation as { error?: unknown } | undefined;
      if (sim && typeof sim.error === "string") throw new Error(sim.error);
      unwrap(tx.result); // simulation Err: throws here, the wallet is never asked
      const sent = await tx.signAndSend();
      const value = unwrap(sent.result);
      const txHash = sent.sendTransactionResponse?.hash;
      if (!txHash) throw new Error("The network returned no transaction hash");
      // A list read that started before this write may be stale: later callers start their own.
      this.listInflight = null;
      return { value, txHash };
    } catch (e) {
      throw layaErrorFromUnknown(e, config.tokenContractId);
    }
  }

  async requestPayoff(p: { family: string; creditor: string; principal: bigint; months: number; shareBps: number; docHash: string }): Promise<TxResult & { requestId: number }> {
    assertAccount(p.family);
    assertAccount(p.creditor);
    const doc_hash = hexToBytes(p.docHash);
    const { value, txHash } = await this.write((c, who) =>
      c.request_payoff({ worker: who, family: p.family, creditor: p.creditor, principal: p.principal, months: p.months, share_bps: p.shareBps, doc_hash }),
    );
    return { txHash, requestId: value };
  }

  async cancelRequest(requestId: number): Promise<TxResult> {
    const { txHash } = await this.write((c) => c.cancel_request({ request_id: requestId }));
    return { txHash };
  }

  async confirmRequest(requestId: number): Promise<TxResult> {
    const { txHash } = await this.write((c) => c.confirm_request({ request_id: requestId }));
    return { txHash };
  }

  async fundRequest(p: { requestId: number; mode: Mode; feeBps: number }): Promise<TxResult & { loanId: number }> {
    const { value, txHash } = await this.write((c, who) =>
      c.fund_request({ funder: who, request_id: p.requestId, mode: modeToNumber(p.mode) as ContractMode, fee_bps: p.feeBps }),
    );
    return { txHash, loanId: value };
  }

  async remit(p: { loanId: number; amount: bigint }): Promise<RemitResult> {
    const { value, txHash } = await this.write((c) => c.remit({ loan_id: p.loanId, amount: p.amount }));
    return remitResultFromContract(value, txHash);
  }

  async setShare(p: { loanId: number; shareBps: number }): Promise<TxResult> {
    const { txHash } = await this.write((c) => c.set_share({ loan_id: p.loanId, share_bps: p.shareBps }));
    return { txHash };
  }

  async addCreditor(address: string): Promise<TxResult> {
    assertAccount(address);
    const { txHash } = await this.write((c) => c.add_creditor({ creditor: address }));
    return { txHash };
  }

  async setPeriod(p: { periodSecs: number; maxPausePeriods: number }): Promise<TxResult> {
    const { txHash } = await this.write((c) => c.set_period({ period_secs: BigInt(p.periodSecs), max_pause_periods: p.maxPausePeriods }));
    this.invalidateConfig();
    return { txHash };
  }

  private invalidateConfig(): void {
    this.cfgGen++;
    this.cfgCache = null;
    this.cfgInflight = null;
  }

  /** Cached for CONFIG_TTL_MS; concurrent calls share one read. */
  async getConfig(): Promise<Config> {
    if (this.cfgCache && Date.now() - this.cfgCache.at < CONFIG_TTL_MS) return this.cfgCache.value;
    if (this.cfgInflight) return this.cfgInflight;
    const gen = this.cfgGen;
    const p = this.read((c) => c.get_config())
      .then((raw) => {
        const value = configFromContract(raw);
        if (gen === this.cfgGen) this.cfgCache = { value, at: Date.now() };
        return value;
      })
      .finally(() => {
        if (this.cfgInflight === p) this.cfgInflight = null;
      });
    this.cfgInflight = p;
    return p;
  }

  /** Funded and Cancelled requests come from memory; Open and Confirmed are always re-read. */
  async getRequest(id: number): Promise<PayoffRequest> {
    const hit = this.finalRequests.get(id);
    if (hit) return hit;
    const r = requestFromContract(await this.readOk((c) => c.get_request({ id })));
    if (isTerminalRequest(r)) this.finalRequests.set(id, r);
    return r;
  }

  /** ids 1..=request_count, newest first. Concurrent calls share one set of reads. */
  listRequests(): Promise<PayoffRequest[]> {
    if (this.listInflight) return this.listInflight;
    const p = (async () => {
      const count = await this.read((c) => c.request_count());
      const ids = Array.from({ length: count }, (_, i) => count - i);
      return Promise.all(ids.map((id) => this.getRequest(id)));
    })().finally(() => {
      if (this.listInflight === p) this.listInflight = null;
    });
    this.listInflight = p;
    return p;
  }

  /**
   * Always re-read: a Repaid loan still changes (remit and set_share are allowed on it), so only
   * the config is cached. missedPeriods and overdue use the current time on every call.
   */
  async getLoan(id: number): Promise<Loan> {
    const [loan, cfg] = await Promise.all([this.readOk((c) => c.get_loan({ id })), this.getConfig()]);
    return loanFromContract(loan, cfg, nowSecs());
  }

  /** get_loan for every Funded request (the loan id equals the request id), newest first. */
  async listLoans(): Promise<Loan[]> {
    const [requests, cfg] = await Promise.all([this.listRequests(), this.getConfig()]);
    const now = nowSecs();
    const funded = requests.filter((r) => r.status === "Funded");
    const loans = await Promise.all(funded.map((r) => this.readOk((c) => c.get_loan({ id: r.id }))));
    return loans.map((l) => loanFromContract(l, cfg, now));
  }

  async isCreditor(address: string): Promise<boolean> {
    assertAccount(address);
    return this.read((c) => c.is_creditor({ creditor: address }));
  }

  async hasTrustline(address: string): Promise<boolean> { return hasUsdcTrustline(address); }
  async getBalance(address: string): Promise<bigint> { return getUsdcBalance(address); }

  /**
   * Optional timeline: the five contract events, oldest first, from the oldest ledger the RPC still
   * keeps. Any failure gives [] (logged), so pages work without events.
   */
  async getEvents(id?: number): Promise<LayaEvent[]> {
    try {
      const server = new RpcServer(config.rpcUrl);
      const { oldestLedger, latestLedger } = await server.getHealth();
      // The events range starts a little after getHealth's oldestLedger and moves forward as ledgers
      // close, so start a margin inside it. Never older than the oldest ledger.
      const startLedger = Math.min(oldestLedger + EVENTS_START_MARGIN, latestLedger);
      const c = this.contract(this.addr ?? config.accounts.admin);
      const t = id === undefined ? undefined : { id };
      const filters = [{
        type: "contract" as const,
        contractIds: [config.contractId],
        topics: [
          c.requestCreatedEventFilter(t),
          c.requestConfirmedEventFilter(t),
          c.payoffEventFilter(t),
          c.remitEventFilter(t),
          c.repaidEventFilter(t),
        ],
      }];
      const out: LayaEvent[] = [];
      let res = await server.getEvents({ filters, startLedger, limit: 200 });
      for (let page = 0; ; page++) {
        for (const e of res.events) {
          const parsed = c.parseEvent(e.topic, e.value);
          const ev = parsed && eventFromContract(parsed, { ledger: e.ledger, ledgerClosedAt: e.ledgerClosedAt, txHash: e.txHash });
          if (ev) out.push(ev);
        }
        // Each call scans only about 10,000 ledgers, so an empty or short page does not mean the end.
        // Keep following the cursor (its high bits are the ledger) until it reaches the latest ledger.
        if (page >= EVENTS_MAX_PAGES || cursorLedger(res.cursor) >= res.latestLedger - 1) break;
        res = await server.getEvents({ filters, cursor: res.cursor, limit: 200 });
      }
      return out.sort((a, b) => a.ledger - b.ledger);
    } catch (e) {
      console.error("getEvents failed; showing no timeline:", e);
      return [];
    }
  }
}
