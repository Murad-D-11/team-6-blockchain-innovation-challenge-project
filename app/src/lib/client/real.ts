/* eslint-disable @typescript-eslint/no-unused-vars -- stub: signatures mirror LayaClient */
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

const notReady = (): never => {
  throw new LayaError(0, "Real client not ready yet");
};

/** Wallet and Horizon reads are live; every other method is a STUB until Nov 5-6 and throws LayaError(0, "Real client not ready yet"). */
export class RealLayaClient implements LayaClient {
  private addr: string | null = null;
  private readonly signer: Signer;
  /** The signer is used by the contract calls once they exist. Default: Freighter. */
  constructor(opts: { signer?: Signer } = {}) {
    this.signer = opts.signer ?? new FreighterSigner();
  }
  async connect(): Promise<string> {
    this.addr = await this.signer.address();
    notifyAddressChanged();
    return this.addr;
  }
  address(): string | null { return this.addr; }
  async requestPayoff(_p: { family: string; creditor: string; principal: bigint; months: number; shareBps: number; docHash: string }): Promise<TxResult & { requestId: number }> { return notReady(); }
  async cancelRequest(_requestId: number): Promise<TxResult> { return notReady(); }
  async confirmRequest(_requestId: number): Promise<TxResult> { return notReady(); }
  async fundRequest(_p: { requestId: number; mode: Mode; feeBps: number }): Promise<TxResult & { loanId: number }> { return notReady(); }
  async remit(_p: { loanId: number; amount: bigint }): Promise<RemitResult> { return notReady(); }
  async setShare(_p: { loanId: number; shareBps: number }): Promise<TxResult> { return notReady(); }
  async addCreditor(_address: string): Promise<TxResult> { return notReady(); }
  async setPeriod(_p: { periodSecs: number; maxPausePeriods: number }): Promise<TxResult> { return notReady(); }
  async getConfig(): Promise<Config> { return notReady(); }
  async listRequests(): Promise<PayoffRequest[]> { return notReady(); }
  async getRequest(_id: number): Promise<PayoffRequest> { return notReady(); }
  async listLoans(): Promise<Loan[]> { return notReady(); }
  async getLoan(_id: number): Promise<Loan> { return notReady(); }
  async isCreditor(_address: string): Promise<boolean> { return notReady(); }
  async hasTrustline(address: string): Promise<boolean> { return hasUsdcTrustline(address); }
  async getBalance(address: string): Promise<bigint> { return getUsdcBalance(address); }
  async getEvents(_id?: number): Promise<LayaEvent[]> { return notReady(); }
}
