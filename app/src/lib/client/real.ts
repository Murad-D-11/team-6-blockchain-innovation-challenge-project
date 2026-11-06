import { Client as LayaContract, type Mode as ContractMode } from "laya-bindings";
import type { AssembledTransaction, Result } from "@stellar/stellar-sdk/contract";
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

const nowSecs = () => Math.floor(Date.now() / 1000);

/**
 * LayaClient against the deployed contract. Writes are simulated first (a contract Err is thrown
 * before the wallet is asked to sign), then signed by the injected Signer and sent. Reads use the
 * simulation result and never sign. Every failure is a LayaError.
 */
export class RealLayaClient implements LayaClient {
  private addr: string | null = null;
  private readonly signer: Signer;
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
    return { txHash };
  }

  async getConfig(): Promise<Config> {
    return configFromContract(await this.read((c) => c.get_config()));
  }

  async getRequest(id: number): Promise<PayoffRequest> {
    return requestFromContract(await this.readOk((c) => c.get_request({ id })));
  }

  /** ids 1..=request_count, newest first. */
  async listRequests(): Promise<PayoffRequest[]> {
    const count = await this.read((c) => c.request_count());
    const ids = Array.from({ length: count }, (_, i) => count - i);
    return Promise.all(ids.map((id) => this.getRequest(id)));
  }

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

  /** Not implemented yet (Nov 7). Pages work with no events. */
  async getEvents(): Promise<LayaEvent[]> { return []; }
}
