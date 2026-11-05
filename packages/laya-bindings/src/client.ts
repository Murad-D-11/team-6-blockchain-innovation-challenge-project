import {RemitResult, Error, Loan, Config, PayoffRequest, Mode, ContractEvent} from './types.js';
import {Result, Spec, AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions, ExternalExecutableRef} from '@stellar/stellar-sdk/contract';
import {Address, xdr} from '@stellar/stellar-sdk';

export interface Client {
  /**
   * Splits a remittance: `to_lender = min(amount * share_bps / 10000, outstanding)`, the rest goes
   * to the family. Allowed on Repaid loans (everything goes to the family). If a transfer fails
   * (for example the worker's balance is too low) the whole call reverts.
   * Check order (spec is silent): loan exists (6), worker signature, amount > 0 (8).
   */
  remit(args: { loan_id: number; amount: bigint }, options?: MethodOptions): Promise<AssembledTransaction<Result<RemitResult, Error>>>;
  get_loan(args: { id: number }, options?: MethodOptions): Promise<AssembledTransaction<Result<Loan, Error>>>;
  /**
   * `min_share_bps <= share_bps <= 1500`, otherwise Error 7. `min_share_bps` never changes.
   * Allowed on Repaid loans too (spec is silent).
   */
  set_share(args: { loan_id: number; share_bps: number }, options?: MethodOptions): Promise<AssembledTransaction<Result<null, Error>>>;
  get_config(options?: MethodOptions): Promise<AssembledTransaction<Config>>;
  /**
   * `missed_periods > max_pause_periods`.
   */
  is_overdue(args: { loan_id: number }, options?: MethodOptions): Promise<AssembledTransaction<Result<boolean, Error>>>;
  /**
   * Changes the period used by `missed_periods` for all loans. `period_secs == 0` is Error 11.
   * `max_pause_periods` has no validation in the spec (0 is allowed).
   */
  set_period(args: { period_secs: bigint; max_pause_periods: number }, options?: MethodOptions): Promise<AssembledTransaction<Result<null, Error>>>;
  get_request(args: { id: number }, options?: MethodOptions): Promise<AssembledTransaction<Result<PayoffRequest, Error>>>;
  is_creditor(args: { creditor: string | Address }, options?: MethodOptions): Promise<AssembledTransaction<boolean>>;
  /**
   * Registers a provider. Registering an already-registered address is a no-op.
   */
  add_creditor(args: { creditor: string | Address }, options?: MethodOptions): Promise<AssembledTransaction<Result<null, Error>>>;
  /**
   * Pays `legal_amount` from the funder to the request's creditor and creates the loan in one
   * transaction. If the token transfer fails (for example the funder's balance is too low) the
   * whole call reverts: no loan, and the request stays Confirmed.
   * Check order (spec is silent): request exists, funder auth, status Confirmed (5), fee (10).
   * Returns the loan id, which equals the request id.
   */
  fund_request(args: { funder: string | Address; request_id: number; mode: Mode; fee_bps: number }, options?: MethodOptions): Promise<AssembledTransaction<Result<number, Error>>>;
  /**
   * 0 when empty.
   */
  request_count(options?: MethodOptions): Promise<AssembledTransaction<number>>;
  /**
   * Only an Open or Confirmed request can be cancelled.
   */
  cancel_request(args: { request_id: number }, options?: MethodOptions): Promise<AssembledTransaction<Result<null, Error>>>;
  /**
   * 0 if Repaid, else `(now - last_payment_at) / period_secs`.
   */
  missed_periods(args: { loan_id: number }, options?: MethodOptions): Promise<AssembledTransaction<Result<number, Error>>>;
  /**
   * `legal_amount = principal` (v2). `months` is validated (1..=60) but affects no amount.
   * Check order (spec is silent): creditor registered, amount, months, share.
   */
  request_payoff(args: { worker: string | Address; family: string | Address; creditor: string | Address; principal: bigint; months: number; share_bps: number; doc_hash: Uint8Array }, options?: MethodOptions): Promise<AssembledTransaction<Result<number, Error>>>;
  /**
   * Open -> Confirmed, signed by the request's own creditor. No registry re-check (spec is silent).
   */
  confirm_request(args: { request_id: number }, options?: MethodOptions): Promise<AssembledTransaction<Result<null, Error>>>;
  /**
   * Unregisters a provider. Existing requests and loans are not touched.
   */
  remove_creditor(args: { creditor: string | Address }, options?: MethodOptions): Promise<AssembledTransaction<Result<null, Error>>>;
}

export class Client extends ContractClient {
  constructor(public readonly options: ContractClientOptions) {
    super(
      new Spec(["AAAAAQAAAAAAAAAAAAAABExvYW4AAAASAAAAAAAAAAhjcmVkaXRvcgAAABMAAAAAAAAACGRvY19oYXNoAAAD7gAAACAAAAAAAAAABmZhbWlseQAAAAAAEwAAAAAAAAAHZmVlX2JwcwAAAAAEAAAAAAAAAAlmdW5kZWRfYXQAAAAAAAAGAAAAAAAAAAZmdW5kZXIAAAAAABMAAAAAAAAAAmlkAAAAAAAEAAAAAAAAAA9sYXN0X3BheW1lbnRfYXQAAAAABgAAAAAAAAAMbGVnYWxfYW1vdW50AAAACwAAAAAAAAANbWluX3NoYXJlX2JwcwAAAAAAAAQAAAAAAAAABG1vZGUAAAfQAAAABE1vZGUAAAAAAAAAC291dHN0YW5kaW5nAAAAAAsAAAAAAAAAC3JlbWl0X2NvdW50AAAAAAQAAAAAAAAACXNoYXJlX2JwcwAAAAAAAAQAAAAAAAAABnN0YXR1cwAAAAAH0AAAAApMb2FuU3RhdHVzAAAAAAAAAAAADHRvdGFsX3JlcGFpZAAAAAsAAAAAAAAAD3RvdGFsX3RvX2ZhbWlseQAAAAALAAAAAAAAAAZ3b3JrZXIAAAAAABM=", "AAAAAwAAAAAAAAAAAAAABE1vZGUAAAACAAAAAAAAAARMb2FuAAAAAAAAAAAAAAAFR3JhbnQAAAAAAAAB", "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACwAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAgAAAAAAAAAVQ3JlZGl0b3JOb3RSZWdpc3RlcmVkAAAAAAAAAwAAAAAAAAAPUmVxdWVzdE5vdEZvdW5kAAAAAAQAAAAAAAAAFEludmFsaWRSZXF1ZXN0U3RhdHVzAAAABQAAAAAAAAAMTG9hbk5vdEZvdW5kAAAABgAAAAAAAAAMSW52YWxpZFNoYXJlAAAABwAAAAAAAAANSW52YWxpZEFtb3VudAAAAAAAAAgAAAAAAAAADUludmFsaWRNb250aHMAAAAAAAAJAAAAAAAAAApJbnZhbGlkRmVlAAAAAAAKAAAAAAAAAA1JbnZhbGlkUGVyaW9kAAAAAAAACw==", "AAAABQAAAAAAAAAAAAAABVJlbWl0AAAAAAAAAQAAAAVyZW1pdAAAAAAAAAQAAAAAAAAAAmlkAAAAAAAEAAAAAQAAAAAAAAAJdG9fbGVuZGVyAAAAAAAACwAAAAAAAAAAAAAACXRvX2ZhbWlseQAAAAAAAAsAAAAAAAAAAAAAAAtvdXRzdGFuZGluZwAAAAALAAAAAAAAAAI=", "AAAAAQAAAAAAAAAAAAAABkNvbmZpZwAAAAAABAAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAABFtYXhfcGF1c2VfcGVyaW9kcwAAAAAAAAQAAAAAAAAAC3BlcmlvZF9zZWNzAAAAAAYAAAAAAAAABXRva2VuAAAAAAAAEw==", "AAAABQAAAAAAAAAAAAAABlBheW9mZgAAAAAAAQAAAAZwYXlvZmYAAAAAAAUAAAAAAAAAAmlkAAAAAAAEAAAAAQAAAAAAAAAGZnVuZGVyAAAAAAATAAAAAAAAAAAAAAAIY3JlZGl0b3IAAAATAAAAAAAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAAAAAAEbW9kZQAAB9AAAAAETW9kZQAAAAAAAAAC", "AAAABQAAAAAAAAAAAAAABlJlcGFpZAAAAAAAAQAAAAZyZXBhaWQAAAAAAAEAAAAAAAAAAmlkAAAAAAAEAAAAAQAAAAI=", "AAAAAwAAAAAAAAAAAAAACkxvYW5TdGF0dXMAAAAAAAIAAAAAAAAABkFjdGl2ZQAAAAAAAAAAAAAAAAAGUmVwYWlkAAAAAAAB", "AAAAAQAAAAAAAAAAAAAAC1JlbWl0UmVzdWx0AAAAAAMAAAAAAAAAC291dHN0YW5kaW5nAAAAAAsAAAAAAAAACXRvX2ZhbWlseQAAAAAAAAsAAAAAAAAACXRvX2xlbmRlcgAAAAAAAAs=", "AAAAAQAAAAAAAAAAAAAADVBheW9mZlJlcXVlc3QAAAAAAAAMAAAAAAAAAAxjb25maXJtZWRfYXQAAAAGAAAAAAAAAApjcmVhdGVkX2F0AAAAAAAGAAAAAAAAAAhjcmVkaXRvcgAAABMAAAAAAAAACGRvY19oYXNoAAAD7gAAACAAAAAAAAAABmZhbWlseQAAAAAAEwAAAAAAAAACaWQAAAAAAAQAAAAAAAAADGxlZ2FsX2Ftb3VudAAAAAsAAAAAAAAABm1vbnRocwAAAAAABAAAAAAAAAAJcHJpbmNpcGFsAAAAAAAACwAAAAAAAAAJc2hhcmVfYnBzAAAAAAAABAAAAAAAAAAGc3RhdHVzAAAAAAfQAAAADVJlcXVlc3RTdGF0dXMAAAAAAAAAAAAABndvcmtlcgAAAAAAEw==", "AAAAAwAAAAAAAAAAAAAADVJlcXVlc3RTdGF0dXMAAAAAAAAEAAAAAAAAAARPcGVuAAAAAAAAAAAAAAAJQ29uZmlybWVkAAAAAAAAAQAAAAAAAAAGRnVuZGVkAAAAAAACAAAAAAAAAAlDYW5jZWxsZWQAAAAAAAAD", "AAAABQAAAAAAAAAAAAAADlJlcXVlc3RDcmVhdGVkAAAAAAABAAAAD3JlcXVlc3RfY3JlYXRlZAAAAAAEAAAAAAAAAAJpZAAAAAAABAAAAAEAAAAAAAAABndvcmtlcgAAAAAAEwAAAAAAAAAAAAAACGNyZWRpdG9yAAAAEwAAAAAAAAAAAAAADGxlZ2FsX2Ftb3VudAAAAAsAAAAAAAAAAg==", "AAAABQAAAAAAAAAAAAAAEFJlcXVlc3RDb25maXJtZWQAAAABAAAAEXJlcXVlc3RfY29uZmlybWVkAAAAAAAAAgAAAAAAAAACaWQAAAAAAAQAAAABAAAAAAAAAAhjcmVkaXRvcgAAABMAAAAAAAAAAg==", "AAAAAAAAAVFTcGxpdHMgYSByZW1pdHRhbmNlOiBgdG9fbGVuZGVyID0gbWluKGFtb3VudCAqIHNoYXJlX2JwcyAvIDEwMDAwLCBvdXRzdGFuZGluZylgLCB0aGUgcmVzdCBnb2VzCnRvIHRoZSBmYW1pbHkuIEFsbG93ZWQgb24gUmVwYWlkIGxvYW5zIChldmVyeXRoaW5nIGdvZXMgdG8gdGhlIGZhbWlseSkuIElmIGEgdHJhbnNmZXIgZmFpbHMKKGZvciBleGFtcGxlIHRoZSB3b3JrZXIncyBiYWxhbmNlIGlzIHRvbyBsb3cpIHRoZSB3aG9sZSBjYWxsIHJldmVydHMuCkNoZWNrIG9yZGVyIChzcGVjIGlzIHNpbGVudCk6IGxvYW4gZXhpc3RzICg2KSwgd29ya2VyIHNpZ25hdHVyZSwgYW1vdW50ID4gMCAoOCkuAAAAAAAABXJlbWl0AAAAAAAAAgAAAAAAAAAHbG9hbl9pZAAAAAAEAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAB9AAAAALUmVtaXRSZXN1bHQAAAAH0AAAAAVFcnJvcgAAAA==", "AAAAAAAAAAAAAAAIZ2V0X2xvYW4AAAABAAAAAAAAAAJpZAAAAAAABAAAAAEAAAPpAAAH0AAAAARMb2FuAAAH0AAAAAVFcnJvcgAAAA==", "AAAAAAAAAIVgbWluX3NoYXJlX2JwcyA8PSBzaGFyZV9icHMgPD0gMTUwMGAsIG90aGVyd2lzZSBFcnJvciA3LiBgbWluX3NoYXJlX2Jwc2AgbmV2ZXIgY2hhbmdlcy4KQWxsb3dlZCBvbiBSZXBhaWQgbG9hbnMgdG9vIChzcGVjIGlzIHNpbGVudCkuAAAAAAAACXNldF9zaGFyZQAAAAAAAAIAAAAAAAAAB2xvYW5faWQAAAAABAAAAAAAAAAJc2hhcmVfYnBzAAAAAAAABAAAAAEAAAPpAAAAAgAAB9AAAAAFRXJyb3IAAAA=", "AAAAAAAAAAAAAAAKZ2V0X2NvbmZpZwAAAAAAAAAAAAEAAAfQAAAABkNvbmZpZwAA", "AAAAAAAAACVgbWlzc2VkX3BlcmlvZHMgPiBtYXhfcGF1c2VfcGVyaW9kc2AuAAAAAAAACmlzX292ZXJkdWUAAAAAAAEAAAAAAAAAB2xvYW5faWQAAAAABAAAAAEAAAPpAAAAAQAAB9AAAAAFRXJyb3IAAAA=", "AAAAAAAAAJxDaGFuZ2VzIHRoZSBwZXJpb2QgdXNlZCBieSBgbWlzc2VkX3BlcmlvZHNgIGZvciBhbGwgbG9hbnMuIGBwZXJpb2Rfc2VjcyA9PSAwYCBpcyBFcnJvciAxMS4KYG1heF9wYXVzZV9wZXJpb2RzYCBoYXMgbm8gdmFsaWRhdGlvbiBpbiB0aGUgc3BlYyAoMCBpcyBhbGxvd2VkKS4AAAAKc2V0X3BlcmlvZAAAAAAAAgAAAAAAAAALcGVyaW9kX3NlY3MAAAAABgAAAAAAAAARbWF4X3BhdXNlX3BlcmlvZHMAAAAAAAAEAAAAAQAAA+kAAAACAAAH0AAAAAVFcnJvcgAAAA==", "AAAAAAAAAAAAAAALZ2V0X3JlcXVlc3QAAAAAAQAAAAAAAAACaWQAAAAAAAQAAAABAAAD6QAAB9AAAAANUGF5b2ZmUmVxdWVzdAAAAAAAB9AAAAAFRXJyb3IAAAA=", "AAAAAAAAAAAAAAALaXNfY3JlZGl0b3IAAAAAAQAAAAAAAAAIY3JlZGl0b3IAAAATAAAAAQAAAAE=", "AAAAAAAAAEtSZWdpc3RlcnMgYSBwcm92aWRlci4gUmVnaXN0ZXJpbmcgYW4gYWxyZWFkeS1yZWdpc3RlcmVkIGFkZHJlc3MgaXMgYSBuby1vcC4AAAAADGFkZF9jcmVkaXRvcgAAAAEAAAAAAAAACGNyZWRpdG9yAAAAEwAAAAEAAAPpAAAAAgAAB9AAAAAFRXJyb3IAAAA=", "AAAAAAAAAX9QYXlzIGBsZWdhbF9hbW91bnRgIGZyb20gdGhlIGZ1bmRlciB0byB0aGUgcmVxdWVzdCdzIGNyZWRpdG9yIGFuZCBjcmVhdGVzIHRoZSBsb2FuIGluIG9uZQp0cmFuc2FjdGlvbi4gSWYgdGhlIHRva2VuIHRyYW5zZmVyIGZhaWxzIChmb3IgZXhhbXBsZSB0aGUgZnVuZGVyJ3MgYmFsYW5jZSBpcyB0b28gbG93KSB0aGUKd2hvbGUgY2FsbCByZXZlcnRzOiBubyBsb2FuLCBhbmQgdGhlIHJlcXVlc3Qgc3RheXMgQ29uZmlybWVkLgpDaGVjayBvcmRlciAoc3BlYyBpcyBzaWxlbnQpOiByZXF1ZXN0IGV4aXN0cywgZnVuZGVyIGF1dGgsIHN0YXR1cyBDb25maXJtZWQgKDUpLCBmZWUgKDEwKS4KUmV0dXJucyB0aGUgbG9hbiBpZCwgd2hpY2ggZXF1YWxzIHRoZSByZXF1ZXN0IGlkLgAAAAAMZnVuZF9yZXF1ZXN0AAAABAAAAAAAAAAGZnVuZGVyAAAAAAATAAAAAAAAAApyZXF1ZXN0X2lkAAAAAAAEAAAAAAAAAARtb2RlAAAH0AAAAARNb2RlAAAAAAAAAAdmZWVfYnBzAAAAAAQAAAABAAAD6QAAAAQAAAfQAAAABUVycm9yAAAA", "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAAtwZXJpb2Rfc2VjcwAAAAAGAAAAAAAAABFtYXhfcGF1c2VfcGVyaW9kcwAAAAAAAAQAAAAA", "AAAAAAAAAA0wIHdoZW4gZW1wdHkuAAAAAAAADXJlcXVlc3RfY291bnQAAAAAAAAAAAAAAQAAAAQ=", "AAAAAAAAADNPbmx5IGFuIE9wZW4gb3IgQ29uZmlybWVkIHJlcXVlc3QgY2FuIGJlIGNhbmNlbGxlZC4AAAAADmNhbmNlbF9yZXF1ZXN0AAAAAAABAAAAAAAAAApyZXF1ZXN0X2lkAAAAAAAEAAAAAQAAA+kAAAACAAAH0AAAAAVFcnJvcgAAAA==", "AAAAAAAAADowIGlmIFJlcGFpZCwgZWxzZSBgKG5vdyAtIGxhc3RfcGF5bWVudF9hdCkgLyBwZXJpb2Rfc2Vjc2AuAAAAAAAObWlzc2VkX3BlcmlvZHMAAAAAAAEAAAAAAAAAB2xvYW5faWQAAAAABAAAAAEAAAPpAAAABAAAB9AAAAAFRXJyb3IAAAA=", "AAAAAAAAAKBgbGVnYWxfYW1vdW50ID0gcHJpbmNpcGFsYCAodjIpLiBgbW9udGhzYCBpcyB2YWxpZGF0ZWQgKDEuLj02MCkgYnV0IGFmZmVjdHMgbm8gYW1vdW50LgpDaGVjayBvcmRlciAoc3BlYyBpcyBzaWxlbnQpOiBjcmVkaXRvciByZWdpc3RlcmVkLCBhbW91bnQsIG1vbnRocywgc2hhcmUuAAAADnJlcXVlc3RfcGF5b2ZmAAAAAAAHAAAAAAAAAAZ3b3JrZXIAAAAAABMAAAAAAAAABmZhbWlseQAAAAAAEwAAAAAAAAAIY3JlZGl0b3IAAAATAAAAAAAAAAlwcmluY2lwYWwAAAAAAAALAAAAAAAAAAZtb250aHMAAAAAAAQAAAAAAAAACXNoYXJlX2JwcwAAAAAAAAQAAAAAAAAACGRvY19oYXNoAAAD7gAAACAAAAABAAAD6QAAAAQAAAfQAAAABUVycm9yAAAA", "AAAAAAAAAF9PcGVuIC0+IENvbmZpcm1lZCwgc2lnbmVkIGJ5IHRoZSByZXF1ZXN0J3Mgb3duIGNyZWRpdG9yLiBObyByZWdpc3RyeSByZS1jaGVjayAoc3BlYyBpcyBzaWxlbnQpLgAAAAAPY29uZmlybV9yZXF1ZXN0AAAAAAEAAAAAAAAACnJlcXVlc3RfaWQAAAAAAAQAAAABAAAD6QAAAAIAAAfQAAAABUVycm9yAAAA", "AAAAAAAAAERVbnJlZ2lzdGVycyBhIHByb3ZpZGVyLiBFeGlzdGluZyByZXF1ZXN0cyBhbmQgbG9hbnMgYXJlIG5vdCB0b3VjaGVkLgAAAA9yZW1vdmVfY3JlZGl0b3IAAAAAAQAAAAAAAAAIY3JlZGl0b3IAAAATAAAAAQAAA+kAAAACAAAH0AAAAAVFcnJvcgAAAA=="]),
      options
    );
  }

   static deploy<T = Client>(args: { admin: string | Address; token: string | Address; period_secs: bigint; max_pause_periods: number }, options: MethodOptions & Omit<ContractClientOptions, 'contractId'> & { salt?: Uint8Array; address?: string; } & ({ wasmHash: Uint8Array | string; format?: "hex" | "base64"; externalRef?: never; } | { externalRef: ExternalExecutableRef; wasmHash?: never; format?: never; })): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(args, options);
  }
  public readonly fromJson = {
    remit : this.txFromJson<Result<RemitResult, Error>>,  get_loan : this.txFromJson<Result<Loan, Error>>,  set_share : this.txFromJson<Result<null, Error>>,  get_config : this.txFromJson<Config>,  is_overdue : this.txFromJson<Result<boolean, Error>>,  set_period : this.txFromJson<Result<null, Error>>,  get_request : this.txFromJson<Result<PayoffRequest, Error>>,  is_creditor : this.txFromJson<boolean>,  add_creditor : this.txFromJson<Result<null, Error>>,  fund_request : this.txFromJson<Result<number, Error>>,  request_count : this.txFromJson<number>,  cancel_request : this.txFromJson<Result<null, Error>>,  missed_periods : this.txFromJson<Result<number, Error>>,  request_payoff : this.txFromJson<Result<number, Error>>,  confirm_request : this.txFromJson<Result<null, Error>>,  remove_creditor : this.txFromJson<Result<null, Error>>
  };

  /** @deprecated Use fromJson instead. */
  public readonly fromJSON = this.fromJson;

  /**
   * Parse a raw contract event (topics + data) into a typed {@link ContractEvent}.
   */
  parseEvent(topics: xdr.ScVal[] | string[], data: xdr.ScVal | string): ContractEvent | undefined {
    return this.spec.parseEvent(topics, data) as ContractEvent | undefined;
  }
  /**
   * Build a topics filter row for the "Remit" event, for use in `Api.EventFilter.topics` when calling `server.getEvents`. Omitted fields match any value.
   */
  remitEventFilter(topicValues?: { id?: number }): string[] {
    return this.spec.eventTopicFilter("Remit", topicValues);
  }
  /**
   * Build a topics filter row for the "Payoff" event, for use in `Api.EventFilter.topics` when calling `server.getEvents`. Omitted fields match any value.
   */
  payoffEventFilter(topicValues?: { id?: number }): string[] {
    return this.spec.eventTopicFilter("Payoff", topicValues);
  }
  /**
   * Build a topics filter row for the "Repaid" event, for use in `Api.EventFilter.topics` when calling `server.getEvents`. Omitted fields match any value.
   */
  repaidEventFilter(topicValues?: { id?: number }): string[] {
    return this.spec.eventTopicFilter("Repaid", topicValues);
  }
  /**
   * Build a topics filter row for the "RequestCreated" event, for use in `Api.EventFilter.topics` when calling `server.getEvents`. Omitted fields match any value.
   */
  requestCreatedEventFilter(topicValues?: { id?: number }): string[] {
    return this.spec.eventTopicFilter("RequestCreated", topicValues);
  }
  /**
   * Build a topics filter row for the "RequestConfirmed" event, for use in `Api.EventFilter.topics` when calling `server.getEvents`. Omitted fields match any value.
   */
  requestConfirmedEventFilter(topicValues?: { id?: number }): string[] {
    return this.spec.eventTopicFilter("RequestConfirmed", topicValues);
  }
}