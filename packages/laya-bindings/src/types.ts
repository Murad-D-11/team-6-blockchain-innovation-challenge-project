import {Address} from '@stellar/stellar-sdk';

    /**
 * Struct: Loan
 */
export interface Loan {
  creditor: string;
  doc_hash: Uint8Array;
  family: string;
  fee_bps: number;
  funded_at: bigint;
  funder: string;
  id: number;
  last_payment_at: bigint;
  legal_amount: bigint;
  min_share_bps: number;
  mode: Mode;
  outstanding: bigint;
  remit_count: number;
  share_bps: number;
  status: LoanStatus;
  total_repaid: bigint;
  total_to_family: bigint;
  worker: string;
}

/**
 * Enum: Mode
 */
export enum Mode {
  /**
   * Enum Case: Loan
   */
  Loan = 0,
  /**
   * Enum Case: Grant
   */
  Grant = 1
}

/**
 * Error Enum: Error
 */
export const Error = {
  1 : { message: "AlreadyInitialized" },
  2 : { message: "NotInitialized" },
  3 : { message: "CreditorNotRegistered" },
  4 : { message: "RequestNotFound" },
  5 : { message: "InvalidRequestStatus" },
  6 : { message: "LoanNotFound" },
  7 : { message: "InvalidShare" },
  8 : { message: "InvalidAmount" },
  9 : { message: "InvalidMonths" },
  10 : { message: "InvalidFee" },
  11 : { message: "InvalidPeriod" }
}

/**
 * Event: Remit
 */
export interface RemitEvent {
  name: "Remit";
  data: {
    id: number;
    to_lender?: bigint;
    to_family?: bigint;
    outstanding?: bigint;
  };
}

/**
 * Struct: Config
 */
export interface Config {
  admin: string;
  max_pause_periods: number;
  period_secs: bigint;
  token: string;
}

/**
 * Event: Payoff
 */
export interface PayoffEvent {
  name: "Payoff";
  data: {
    id: number;
    funder?: string;
    creditor?: string;
    amount?: bigint;
    mode?: Mode;
  };
}

/**
 * Event: Repaid
 */
export interface RepaidEvent {
  name: "Repaid";
  data: {
    id: number;
  };
}

/**
 * Enum: LoanStatus
 */
export enum LoanStatus {
  /**
   * Enum Case: Active
   */
  Active = 0,
  /**
   * Enum Case: Repaid
   */
  Repaid = 1
}

/**
 * Struct: RemitResult
 */
export interface RemitResult {
  outstanding: bigint;
  to_family: bigint;
  to_lender: bigint;
}

/**
 * Struct: PayoffRequest
 */
export interface PayoffRequest {
  confirmed_at: bigint;
  created_at: bigint;
  creditor: string;
  doc_hash: Uint8Array;
  family: string;
  id: number;
  legal_amount: bigint;
  months: number;
  principal: bigint;
  share_bps: number;
  status: RequestStatus;
  worker: string;
}

/**
 * Enum: RequestStatus
 */
export enum RequestStatus {
  /**
   * Enum Case: Open
   */
  Open = 0,
  /**
   * Enum Case: Confirmed
   */
  Confirmed = 1,
  /**
   * Enum Case: Funded
   */
  Funded = 2,
  /**
   * Enum Case: Cancelled
   */
  Cancelled = 3
}

/**
 * Event: RequestCreated
 */
export interface RequestCreatedEvent {
  name: "RequestCreated";
  data: {
    id: number;
    worker?: string;
    creditor?: string;
    legal_amount?: bigint;
  };
}

/**
 * Event: RequestConfirmed
 */
export interface RequestConfirmedEvent {
  name: "RequestConfirmed";
  data: {
    id: number;
    creditor?: string;
  };
}
    export type ContractEvent = RemitEvent | PayoffEvent | RepaidEvent | RequestCreatedEvent | RequestConfirmedEvent;
    