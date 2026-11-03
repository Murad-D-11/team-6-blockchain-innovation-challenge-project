export type Mode = "Loan" | "Grant";
export type RequestStatus = "Open" | "Confirmed" | "Funded" | "Cancelled";
export type LoanStatus = "Active" | "Repaid";
export type Role = "worker" | "family" | "funder" | "creditor" | "admin" | "unknown";

export interface Config { admin: string; token: string; periodSecs: number; maxPausePeriods: number }

export interface PayoffRequest {
  id: number; worker: string; family: string; creditor: string;
  principal: bigint; months: number; legalAmount: bigint; shareBps: number;
  docHash: string;            // 64 lowercase hex chars, no 0x
  status: RequestStatus; createdAt: number; confirmedAt: number;  // unix seconds; 0 = not yet
}

export interface Loan {
  id: number; worker: string; family: string; funder: string; creditor: string;
  mode: Mode; legalAmount: bigint; feeBps: number; outstanding: bigint;
  shareBps: number; minShareBps: number; docHash: string;
  fundedAt: number; lastPaymentAt: number;
  totalRepaid: bigint; totalToFamily: bigint; remitCount: number; status: LoanStatus;
  missedPeriods: number; isOverdue: boolean;   // computed in TS by formulas.ts
}

export interface TxResult { txHash: string }
export interface RemitResult extends TxResult { toLender: bigint; toFamily: bigint; outstanding: bigint }

export interface LayaEvent {
  type: "request_created" | "request_confirmed" | "payoff" | "remit" | "repaid";
  id: number; ledger: number; timestamp: number; txHash: string; data: Record<string, unknown>;
}

export class LayaError extends Error {
  constructor(public code: number, message: string) { super(message); }
} // code = contract error number 1-11; 0 = wallet, user rejected, or network

export interface LayaClient {
  connect(): Promise<string>;                 // opens Freighter, returns G-address
  address(): string | null;
  // writes (signed by the connected Freighter account)
  requestPayoff(p: { family: string; creditor: string; principal: bigint; months: number; shareBps: number; docHash: string }): Promise<TxResult & { requestId: number }>;
  cancelRequest(requestId: number): Promise<TxResult>;
  confirmRequest(requestId: number): Promise<TxResult>;
  fundRequest(p: { requestId: number; mode: Mode; feeBps: number }): Promise<TxResult & { loanId: number }>;
  remit(p: { loanId: number; amount: bigint }): Promise<RemitResult>;
  setShare(p: { loanId: number; shareBps: number }): Promise<TxResult>;
  addCreditor(address: string): Promise<TxResult>;
  setPeriod(p: { periodSecs: number; maxPausePeriods: number }): Promise<TxResult>;
  // reads (no signature)
  getConfig(): Promise<Config>;
  listRequests(): Promise<PayoffRequest[]>;   // ids 1..=request_count, newest first
  getRequest(id: number): Promise<PayoffRequest>;
  listLoans(): Promise<Loan[]>;               // get_loan for every Funded request
  getLoan(id: number): Promise<Loan>;
  isCreditor(address: string): Promise<boolean>;
  hasTrustline(address: string): Promise<boolean>;   // test USDC trustline, via Horizon
  getBalance(address: string): Promise<bigint>;      // test USDC, via Horizon, 7 decimals
  getEvents(id?: number): Promise<LayaEvent[]>;      // optional timeline; [] if older than ~7 days
}
