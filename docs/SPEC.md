> **Historical planning document (Nov 2026).** It describes earlier versions of the idea and uses the earlier name Laya. It is superseded by the root README.md and the live app. Some claims here, including legal ones, were not verified.

SUPERSEDED by docs/PLAN-v2.md (Laya v2). Kept for history. Do not build from this file.

# Laya: Build Plan and Task Split

Nov 3, 2026 · @Abdullah Bakuvi

## How to use this doc with your Claude

Give your Claude this whole doc, then the prompt for your role from your own section. The two "Shared contract" sections are the single source of truth: every name, type, unit and file path in them is fixed.

**Rules every Claude must follow**

1. Build only your own section. Never edit files owned by someone else (ownership is listed in Shared contract B).
2. Use the exact names, field names, units and error codes in the Shared contract sections. Don't rename, "improve" or add fields.
3. If something you need is missing or unclear, stop and ask your teammate. Don't guess. A wrong guess is the most common way four parts fail to connect.
4. Changing the Shared contract needs three things: the owner agrees, it's posted in the group chat, and this doc gets updated with a new version number (v1.0 → v1.1).
5. Use testnet only, fictional people and fictional documents. Never use real money, real IDs or real loan documents.

**Names.** "Laya" (Tagalog for "free") is a working name. Code uses `laya` everywhere, and that won't change even if the public name does. Check the domain and trademark before the showcase.

**Roles.** Names are a suggestion. Swap people freely, but don't move tasks between roles without updating the handoff table.

## Final review: what the feedback loop changed

The plan went through two red-team rounds yesterday and a final technical review today. The v0.9 spec had 3 blockers and about 20 smaller gaps. All of them are fixed in this v1.0, which is ready to implement as written.

| Found in review | Why it mattered | Fix now in the spec |
| --- | --- | --- |
| **Fake debt (blocker).** A worker and a registered lender could invent a debt, and the funder only saw a hash. | Judges would ask "how do you know the debt is real?" | The old lender must **sign a confirmation** that the legal amount settles the debt in full before anyone can fund it. This also answers "why would the loan shark comply": they sign acceptance on-chain. |
| **Proof page would go blank (blocker).** Stellar RPC keeps events for about 7 days. | Loans funded Nov 6 would show nothing on Nov 16. | Proof page reads contract storage. Events are an optional timeline. |
| **`remit` returned too little (blocker).** TS expected `outstanding`, Rust returned 2 numbers. | Integration would fail on day 1. | `remit` returns a `RemitResult` struct with 3 fields. |
| Worker could drop their share to 1% after funding | The loan might never end | Share can't go below the share agreed at funding. |
| A tiny remit reset the pause clock | Pausing could be gamed | Only a payment of 1 USDC or more to the lender resets the clock. |
| 60-second demo "months" made older loans look massively overdue | Confusing demo | Admin `set_period`, and a fresh loan is created live in every demo. |
| Enum, timestamp and hash formats differed between Rust and TypeScript | Silent mismatches between teammates' code | One translation layer (Abdullah's client) with exact conversion rules. |
| Old event and setup APIs | Code wouldn't compile on current SDKs | `__constructor` and `#[contractevent]`, SDKs that support Protocol 30. |
| Abdullah was on the critical path for almost everything | One person blocking three | Setup scripts moved to Murad, demo video to Luke. |
| Nice-to-have UI (animations, charts) | Risk of unfinished features | Cut to simple versions. |

**What stays honest in the pitch:** an overdue flag has no on-chain penalty (the funder follows up off-chain), the creditor registry stands in for the Philippine SEC list, and real cash-out to pesos is roadmap (MoneyGram cash pickup for Stellar USDC exists today). Repayment only covers remittances sent through Laya, and 8% is the statutory ceiling for qualifying placement-fee loans that we use as a settlement benchmark, not a legal ruling.

## v1.1 changes (Nov 3)

v1.1 changes wording only. No type, function, error code or golden number changed, so H0 and the contract are built exactly as in v1.0.

| Change | Why | Where |
| --- | --- | --- |
| 8% is described as the statutory ceiling for qualifying placement-fee loans; the "unenforceable" claim is gone | RA 10022 targets lending above 8% a year for legal placement fees (with postdated checks); it isn't a blanket cap on every OFW debt | Problem, Solution, Judge Q&A, deck |
| Repayment covers remittances sent through Laya | `remit` needs the worker's signature; Laya can't intercept other remittance services | Solution, one-liner, Judge Q&A |
| The family member is the designated recipient, not a co-borrower | The contract has no family consent or repayment obligation | `people.json`, Solution, Judge Q&A |
| The proof page says what the fingerprint proves | A hash shows the document is unchanged, not that it's genuine | `/proof/[id]` (Luke) |
| Protocol 30 tooling note | The Rust SDK may only be at 30.0.0-rc.1, and the matching CLI was still pending in late October | Stack, Murad's tasks |
| W-address handling | Protocol 30 SDKs add W strkeys for muxed contract addresses | Abdullah's tasks |
| Kept: the share can't drop below the funded share | Lowering it after funding lets a loan never end (v1.0 review); the payment already flexes because it's a percentage | No change |

Post this in the group chat; Luke confirms the `people.json` change.

## The problem and the solution

**Problem space:** 1, Access to Fair Financial Assets and Affordable Financing, target area 5: "loans that fit real income."

**Problem.** Filipino workers borrow to pay the fees for jobs abroad. About 8 in 10 surveyed workers borrowed, often from a lender their recruiter picked. Complaints document licensed lenders charging 61% to 578% a year, while RA 10022 treats lending above 8% a year for legal placement fees as illegal recruitment. Repayment schedules are rigid while income isn't, so workers get stuck in jobs they can't leave. Companies already pay back recruitment fees, but the money arrives late, the amounts don't match, and nobody can verify it.

**Solution: four steps, all on Stellar.**

1. **Request.** The worker names their old lender (it must be on the registered list), what they borrowed, for how many months, their family's wallet, the share of each remittance they'll repay (1% to 15%), and a fingerprint (hash) of the loan contract. The contract calculates the **legal amount**: what they borrowed plus 8% a year, the statutory ceiling for qualifying placement-fee loans.
2. **Creditor accepts.** The old lender signs that the legal amount settles the debt in full. No signature, no payoff.
3. **Funder pays.** A funder pays the legal amount **directly to the old lender**. Two kinds of funder:
   - **Loan:** a fair lender (microfinance, co-op). The worker owes the legal amount plus a flat fee of at most 8%.
   - **Grant:** an employer or brand paying off recruitment debt. The worker owes nothing.
4. **Repay with what they already send home.** Each time the worker sends money home through Laya, the contract splits it in one transaction: their share goes to the funder until the loan is repaid, the rest goes to family. No money sent means repayment pauses. After 3 missed periods the loan is flagged overdue, and the funder follows up off-chain.

**Proof.** The settlement receipt (who was paid, how much, the document fingerprint, the creditor's acceptance) lives in contract storage. Anyone can open the proof page and re-check a document against the stored fingerprint.

**One line for judges:** *We pay off migrant workers' illegal recruitment debt at its legal value, with the lender's signed acceptance, and they repay a fair loan with a capped slice of each remittance they send through Laya, which pauses when income stops, all provable on Stellar.*

## The demo we are building

This script is the definition of done: if every step runs live on testnet, the project is finished. All people, companies and documents are fictional.

| # | Who (Freighter account) | Page | What happens on screen | Owner |
| --- | --- | --- | --- | --- |
| 1 | Worker (Maria, in Dubai) | `/worker/request` | Picks "QuickPeso Lending Corp" (registered), enters 860 USDC borrowed (≈₱50,000), 12 months, 15% share, family wallet, uploads the sample loan PDF. Screen shows **legal amount 928.80 USDC**. Signs. | Ananya |
| 2 | Creditor (QuickPeso) | `/creditor` | Sees the request and the legal amount, clicks **Accept settlement**, signs. | Luke |
| 3 | Funder (Bayanihan Microfinance) | `/funder` | Sees the confirmed request, re-checks the PDF against its fingerprint (✓ match), chooses **Loan, 3% fee**, signs. 928.80 USDC moves straight to QuickPeso. | Luke |
| 4 | Anyone | `/proof/1` | Public receipt: creditor paid, amount, legal calculation, creditor's acceptance, document fingerprint, stellar.expert links. | Luke |
| 5 | Worker | `/worker` | Sends **400 USDC** home. Result card: **60 to the lender, 340 to family**, outstanding 956.66 → 896.66. | Ananya |
| 6 | Worker | `/worker` | Waits one period (60 s = one "month"). Status shows **Paused, 1 of 3**, no fee, balance unchanged. Next to it, a static card: the old loan would have added about ₱2,250 this month (illustrative 4.5% a month). | Ananya |
| 7 | Family | `/family` | Mother's balance up 340 USDC, total received. | Ananya |
| 8 | Funder (as an employer) | `/funder` | A second request, funded as a **Grant**: worker owes 0, receipt shows "debt retired by employer". | Luke |

**Rules for the live demo**

- Create a fresh request live every time. Old loans show many missed periods because a demo "month" is 60 seconds.
- Run Murad's demo-reset script within an hour of judging. It tops up balances and resets the period to 60 s.
- Have Luke's backup video ready in case the venue Wi-Fi fails.

## Architecture

Three layers, one owner each. Pages never call Stellar directly, and only Abdullah's client translates between contract and app formats. That's what lets four people build in parallel without breaking each other.

&#91;embedded content: Laya architecture · 3 layers, 4 owners\]

Until Nov 6 the pages run on the mock client, which follows the same rules as the contract. After that, flipping `NEXT_PUBLIC_USE_MOCK=false` switches every page to testnet with no page code changes.

## Shared contract A: the smart contract (v1.0)

This is the exact public interface of the `laya` Soroban contract. Murad implements it; everyone else codes against it. Names, field order, types and error numbers are fixed.

**Types**

```rust
use soroban_sdk::{contract, contracterror, contractevent, contractimpl, contracttype, Address, BytesN, Env};

#[contracttype] #[derive(Clone, Copy, PartialEq, Eq, Debug)] #[repr(u32)]
pub enum Mode { Loan = 0, Grant = 1 }

#[contracttype] #[derive(Clone, Copy, PartialEq, Eq, Debug)] #[repr(u32)]
pub enum RequestStatus { Open = 0, Confirmed = 1, Funded = 2, Cancelled = 3 }

#[contracttype] #[derive(Clone, Copy, PartialEq, Eq, Debug)] #[repr(u32)]
pub enum LoanStatus { Active = 0, Repaid = 1 }

#[contracttype] #[derive(Clone, Debug, PartialEq, Eq)]
pub struct Config { pub admin: Address, pub token: Address, pub period_secs: u64, pub max_pause_periods: u32 }

#[contracttype] #[derive(Clone, Debug, PartialEq, Eq)]
pub struct PayoffRequest {
    pub id: u32, pub worker: Address, pub family: Address, pub creditor: Address,
    pub principal: i128, pub months: u32, pub legal_amount: i128, pub share_bps: u32,
    pub doc_hash: BytesN<32>, pub status: RequestStatus,
    pub created_at: u64, pub confirmed_at: u64,   // confirmed_at = 0 until confirmed
}

#[contracttype] #[derive(Clone, Debug, PartialEq, Eq)]
pub struct Loan {
    pub id: u32, pub worker: Address, pub family: Address, pub funder: Address, pub creditor: Address,
    pub mode: Mode, pub legal_amount: i128, pub fee_bps: u32, pub outstanding: i128,
    pub share_bps: u32, pub min_share_bps: u32, pub doc_hash: BytesN<32>,
    pub funded_at: u64, pub last_payment_at: u64,
    pub total_repaid: i128, pub total_to_family: i128, pub remit_count: u32, pub status: LoanStatus,
}

#[contracttype] #[derive(Clone, Debug, PartialEq, Eq)]
pub struct RemitResult { pub to_lender: i128, pub to_family: i128, pub outstanding: i128 }

#[contracterror] #[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)] #[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,   // reserved, unused
    NotInitialized = 2,       // reserved, unused
    CreditorNotRegistered = 3,
    RequestNotFound = 4,
    InvalidRequestStatus = 5, // wrong status for this action
    LoanNotFound = 6,
    InvalidShare = 7,         // outside 100..=1500, or below min_share_bps
    InvalidAmount = 8,        // <= 0, or principal > 1_000_000_000_000_000
    InvalidMonths = 9,        // outside 1..=60
    InvalidFee = 10,          // Loan: fee_bps > 800; Grant: fee_bps != 0
    InvalidPeriod = 11,       // period_secs == 0
}

#[contracttype]
pub enum DataKey { Config, Count, Creditor(Address), Request(u32), Loan(u32) }
```

**Functions** (`Env` first argument omitted). A loan's id always equals its request's id. Ids start at 1.

```rust
fn __constructor(admin: Address, token: Address, period_secs: u64, max_pause_periods: u32)
// Admin only (config.admin.require_auth())
fn add_creditor(creditor: Address) -> Result<(), Error>
fn remove_creditor(creditor: Address) -> Result<(), Error>
fn set_period(period_secs: u64, max_pause_periods: u32) -> Result<(), Error>
// Worker
fn request_payoff(worker: Address, family: Address, creditor: Address, principal: i128,
                  months: u32, share_bps: u32, doc_hash: BytesN<32>) -> Result<u32, Error>
    // worker.require_auth(); creditor registered; status = Open; emits RequestCreated
fn cancel_request(request_id: u32) -> Result<(), Error>
    // request.worker.require_auth(); only if Open or Confirmed -> Cancelled
fn remit(loan_id: u32, amount: i128) -> Result<RemitResult, Error>   // loan.worker.require_auth()
fn set_share(loan_id: u32, share_bps: u32) -> Result<(), Error>
    // loan.worker.require_auth(); min_share_bps <= share_bps <= 1500
// Creditor
fn confirm_request(request_id: u32) -> Result<(), Error>
    // request.creditor.require_auth(); Open -> Confirmed; confirmed_at = now
// Funder
fn fund_request(funder: Address, request_id: u32, mode: Mode, fee_bps: u32) -> Result<u32, Error>
    // funder.require_auth(); request must be Confirmed
    // token.transfer(funder -> creditor, legal_amount); creates Loan; request -> Funded
// Read-only
fn get_config() -> Config
fn request_count() -> u32            // 0 when empty
fn get_request(id: u32) -> Result<PayoffRequest, Error>
fn get_loan(id: u32) -> Result<Loan, Error>
fn is_creditor(creditor: Address) -> bool
fn missed_periods(loan_id: u32) -> Result<u32, Error>
fn is_overdue(loan_id: u32) -> Result<bool, Error>
```

**Rules and formulas** (integer math, division truncates)

- `legal_amount = principal + principal * 800 * months / 120000` (8% a year, simple interest).
- Loan mode: `outstanding = legal_amount + legal_amount * fee_bps / 10000`, `status = Active`. Grant mode: `outstanding = 0`, `status = Repaid`.
- At funding: `min_share_bps = share_bps = request.share_bps`, `funded_at = last_payment_at = now`.
- `remit`: `to_lender = min(amount * share_bps / 10000, outstanding)`, `to_family = amount - to_lender`. Transfer worker → funder (if > 0) and worker → family (if > 0). Update `outstanding`, `total_repaid`, `total_to_family`, `remit_count`. Allowed on Repaid loans (everything goes to family).
- Pause clock: set `last_payment_at = now` only if `to_lender >= 10_000_000` (1 USDC) or the loan just became Repaid.
- `missed_periods = 0` if Repaid, else `(now - last_payment_at) / period_secs`. `is_overdue = missed_periods > max_pause_periods`.
- `now` = `env.ledger().timestamp()` (seconds).

**Events** (use `#[contractevent]` only). The topics are the snake\_case struct name, then `id`. The data is a map of the other fields.

```rust
#[contractevent] pub struct RequestCreated { #[topic] pub id: u32, pub worker: Address, pub creditor: Address, pub legal_amount: i128 }
#[contractevent] pub struct RequestConfirmed { #[topic] pub id: u32, pub creditor: Address }
#[contractevent] pub struct Payoff { #[topic] pub id: u32, pub funder: Address, pub creditor: Address, pub amount: i128, pub mode: Mode }
#[contractevent] pub struct Remit { #[topic] pub id: u32, pub to_lender: i128, pub to_family: i128, pub outstanding: i128 }
#[contractevent] pub struct Repaid { #[topic] pub id: u32 }
```

**Storage and lifetime.** `Config` and `Count` live in instance storage; `Creditor`, `Request` and `Loan` live in persistent storage. On every write, extend the instance TTL and the written entry's TTL with threshold 120\_960 and extend-to 518\_400 ledgers (about 30 days). Keep `overflow-checks = true` in the release profile.

**Golden test numbers** (7 decimals: 1 USDC = 10\_000\_000). Murad's unit tests and Abdullah's mock must both produce these exactly.

| Case | Input | Expected |
| --- | --- | --- |
| Legal amount | principal 8\_600\_000\_000, months 12 | legal\_amount 9\_288\_000\_000 |
| Loan fee | legal 9\_288\_000\_000, fee\_bps 300 | outstanding 9\_566\_640\_000 |
| Normal remit | amount 4\_000\_000\_000, share 1500 | to\_lender 600\_000\_000, to\_family 3\_400\_000\_000, outstanding 8\_966\_640\_000 |
| Final remit | outstanding 100\_000\_000, amount 4\_000\_000\_000, share 1500 | to\_lender 100\_000\_000, to\_family 3\_900\_000\_000, status Repaid |
| Grant | fund as Grant, fee 0 | outstanding 0, status Repaid; remit 4\_000\_000\_000 → 0 and 4\_000\_000\_000 |
| Dust remit | amount 50\_000\_000, share 1500 | to\_lender 7\_500\_000, clock not reset |
| Share floor | set\_share(1400) when min\_share\_bps 1500 | Error 7 |
| Fund unconfirmed | fund\_request on Open request | Error 5 |

## Shared contract B: app, types, config and files (v1.1)

The app talks to Stellar only through one object, `LayaClient`. Ananya and Luke's pages import nothing else from Stellar. Abdullah's client is the **only** place where contract formats are translated to app formats.

**Stack (fixed).** Next.js App Router + TypeScript + Tailwind + shadcn/ui. `@stellar/stellar-sdk` and `@stellar/freighter-api`, in versions that support Protocol 30 (JS SDK v17.3.0 or later). Rust `soroban-sdk` 30.x (stable if released, otherwise 30.0.0-rc.1; confirm on crates.io) and a Stellar CLI that works against the upgraded testnet. Pin exact versions on Nov 5; nobody upgrades after that. No backend server; hosting on Vercel. Network: Stellar testnet, RPC `https://soroban-testnet.stellar.org`.

**Repo layout and owners**

```text
laya/
  contracts/laya/            Murad    Rust contract + tests
  packages/laya-bindings/    Murad    generated: stellar contract bindings typescript
  scripts/                   Murad    setup-testnet.sh, deploy.sh, demo-reset.sh (stellar CLI, idempotent)
  app/src/config/testnet.json  Murad  written by scripts (public data only; inside app/ so Next.js can import it)
  app/src/lib/               Abdullah types.ts, units.ts, formulas.ts, hash.ts, client/ (mock + real), hooks
  app/src/components/        Ananya   shared UI components
  app/src/app/worker/        Ananya   worker pages
  app/src/app/family/        Ananya   family page
  app/src/app/funder/        Luke     funder page
  app/src/app/creditor/      Luke     creditor page
  app/src/app/proof/[id]/    Luke     public proof page
  app/src/app/admin/         Luke     admin page
  app/src/data/              Luke     creditors.json, people.json
  app/public/samples/        Luke     sample-loan-contract.pdf (fictional)
  .env.local                 secret keys only, never committed
```

**Types** (`app/src/lib/types.ts`, owned by Abdullah)

```ts
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
```

**Translation rules** (inside the real client only)

| Contract (bindings) | App (`types.ts`) |
| --- | --- |
| `i128` → `bigint` | stays `bigint`, 7 decimals (1 USDC = 10\_000\_000n) |
| `u64` → `bigint` | `Number(x)` for all timestamps and `periodSecs` |
| `u32` → `number` | `number` |
| enum numbers | strings: `["Loan","Grant"][n]`, `["Open","Confirmed","Funded","Cancelled"][n]`, `["Active","Repaid"][n]` |
| `BytesN<32>` → `Buffer` | hex: `buf.toString("hex")`; back with `Buffer.from(hex, "hex")` |
| snake\_case fields | camelCase fields |
| contract `Err` / failed simulation | `LayaError(code)`; read the code from the result or match `/Error\(Contract, #(\d+)\)/` |

**Helpers** (Abdullah, in `app/src/lib/`)

- `units.ts`: `toUnits("400.00") → 4_000_000_000n`, `fromUnits(4_000_000_000n) → "400.00"`, `formatUsd`, `formatPhp`, `PHP_PER_USD = 58` (label it "illustrative rate" in the UI).
- `formulas.ts`: `legalAmount`, `outstandingFor`, `split`, `missedPeriods`, `isOverdue`. Exact copies of the contract rules; must pass the golden numbers.
- `hash.ts`: `hashFile(file: File): Promise<string>` (SHA-256, 64 hex).
- `useLaya()`: returns the mock client if `NEXT_PUBLIC_USE_MOCK=true`, otherwise the real one.
- `useWallet()`: returns `{ address, role }` by matching the address to `config/testnet.json` accounts.
- `config.ts`: loads `config/testnet.json` and exposes it typed.

**Config file** (`config/testnet.json`, written by Murad's scripts, public keys only. Full path: app/src/config/testnet.json everywhere this doc says config/testnet.json)

```json
{
  "network": "testnet",
  "rpcUrl": "https://soroban-testnet.stellar.org",
  "horizonUrl": "https://horizon-testnet.stellar.org",
  "networkPassphrase": "Test SDF Network ; September 2015",
  "contractId": "C...",
  "tokenContractId": "C...",
  "asset": { "code": "USDC", "issuer": "G..." },
  "periodSecs": 60,
  "maxPausePeriods": 3,
  "accounts": { "admin": "G...", "issuer": "G...", "worker": "G...", "family": "G...", "funder": "G...", "creditor": "G..." },
  "explorerTxUrl": "https://stellar.expert/explorer/testnet/tx/",
  "deployedAt": "2026-11-05T00:00:00Z"
}
```

**Demo data** (`app/src/data/`, owned by Luke, all fictional)

```json
// creditors.json
[{ "address": "G...creditor from config", "name": "QuickPeso Lending Corp", "secRegNo": "CS2019-00000 (fictional)", "fictional": true }]
// people.json
{
  "worker": { "name": "Maria Santos", "country": "United Arab Emirates", "employer": "Desert Pearl Hotel", "job": "Housekeeper" },
  "family": { "name": "Lorna Santos", "relation": "Mother, designated recipient", "city": "Iloilo" },
  "funder": { "name": "Bayanihan Microfinance", "type": "Loan" },
  "grantFunder": { "name": "Desert Pearl Hotel (employer)", "type": "Grant" }
}
```

**Accounts.** Six testnet accounts: admin, issuer, worker, family, funder, creditor. All are funded by friendbot. Worker, family, funder and creditor hold a trustline to test USDC (self-issued; label it "test USDC" in the UI). Starting balances: worker 2,000, funder 10,000. Import worker, funder, creditor and admin into Freighter on every demo laptop, with Freighter set to Testnet. Family never signs.

**Old-loan comparison** (Ananya only). It's stored in the browser under `laya:oldloan:<requestId>` as `{ "annualRatePct": 54, "monthlyPaymentPhp": 6400 }` and shown on a static card. No one else reads it.

## Who waits on whom

Only two people ever wait: Abdullah waits on Murad's deployed contract, and Ananya and Luke wait on Abdullah's real client. Everyone builds against the mock until then, so nobody sits idle.

| # | Handoff | From → To | Due | What "done" means | What the receiver does meanwhile |
| --- | --- | --- | --- | --- | --- |
| H0 | App skeleton | Abdullah → all | Tue Nov 3, 11 PM | Repo on GitHub; Next.js app runs; `types.ts`, `units.ts`, `formulas.ts`, `hash.ts`, `useLaya`, `useWallet` and a working **MockLayaClient** committed; `NEXT_PUBLIC_USE_MOCK=true` | Ananya and Luke sketch pages and set up shadcn/ui; Murad writes the contract |
| H1 | Demo data | Luke → Ananya | Wed Nov 4, 6 PM | `creditors.json`, `people.json`, sample PDF committed | Ananya uses placeholder text |
| H2 | Testnet accounts and token | Murad → all | Wed Nov 4, 11 PM | `setup-testnet.sh` run; six accounts funded; test USDC issued with trustlines and balances; `testnet.json` has accounts + token; secrets shared privately | Abdullah codes Horizon reads against the JSON format above |
| H3 | Shared UI components | Ananya → Luke | Thu Nov 5, 6 PM | `AmountDisplay`, `TxLink`, `RoleGuard`, `StatusBadge`, `PageShell` committed | Luke uses plain shadcn components and swaps later |
| H4 | Deployed contract | Murad → Abdullah | Thu Nov 5, 11 PM | All golden tests pass; contract deployed **after** the Protocol 30 upgrade; `contractId` in `testnet.json`; creditor registered; `packages/laya-bindings` generated and committed | Abdullah writes the real client against the signatures in Shared contract A |
| H5 | Real client live | Abdullah → Ananya, Luke | **Fri Nov 6, 9 PM (hard checkpoint)** | `scripts/smoke.ts` runs request → confirm → fund → remit on testnet and prints the golden numbers | Pages keep running on the mock |
| H6 | Pages on real chain | Ananya, Luke → all | Sun Nov 8 | Every demo step works with `NEXT_PUBLIC_USE_MOCK=false` | Bugs go to the owner of the failing layer |
| H7 | Hosted app | Abdullah → all | Mon Nov 9 | Vercel URL works on a phone and a second laptop | localhost |

**If a handoff slips**

- **H4 late:** Murad and Abdullah pair on it. Ananya and Luke keep going on the mock.
- **H5 missed (Nov 6, 9 PM):** the whole team meets that night. Either cut the scope of the contract (drop `set_share` and `cancel_request` first) or demo on the mock with one real testnet transaction.
- **Testnet reset or SDK breakage:** Murad's scripts are idempotent, so re-running `setup-testnet.sh` then `deploy.sh` takes about 5 minutes.

## Person 1, Murad: smart contract, token and scripts

You own everything on-chain: the `laya` contract, its tests, the test USDC token, the testnet accounts, deployment and the TypeScript bindings. You wait on nobody.

**Paste this into your Claude**

```text
I'm Murad, Person 1 on a 4-person hackathon team building "Laya" on Stellar testnet.
The attached doc is our spec. "Shared contract A" is the exact interface I must implement;
"Shared contract B" shows how teammates will call it. Do not rename anything, change types,
add parameters or change error numbers. If the spec is ambiguous, stop and ask me.
My files: contracts/laya/, packages/laya-bindings/, scripts/*.sh, app/src/config/testnet.json.
Never edit files owned by others. Use soroban-sdk 30.x (Protocol 30), #[contractevent] for
events, __constructor for setup. Write unit tests for every golden number and every error.
Start with: contract skeleton with all types and function signatures, then tests, then logic.
```

**Tasks**

- [ ] **Tue Nov 3.** Install Rust, the wasm target and the Stellar CLI (after the Protocol 30 vote at noon Toronto time, use the newest releases). If only soroban-sdk 30.0.0-rc.1 is out, use it: Laya needs no Protocol 30 features. Confirm the CLI works against the upgraded testnet; if setup takes more than an hour, ask in the Stellar Discord. Create `contracts/laya` with every type and function signature from Shared contract A, returning placeholder values so it compiles.
- [ ] **Wed Nov 4.** Implement all functions. Unit tests: every golden number, every error code, auth (wrong signer fails), share floor, dust remit, Grant mode, remit on a Repaid loan. Use the SDK's test token (`register_stellar_asset_contract_v2`).
- [ ] **Wed Nov 4 → H2.** `scripts/setup-testnet.sh` (idempotent): creates and friendbot-funds 6 identities (admin, issuer, worker, family, funder, creditor), creates trustlines to `USDC:<issuer>`, deploys the asset's Stellar Asset Contract (`stellar contract asset deploy`), pays worker 2,000 and funder 10,000, writes accounts, asset and `tokenContractId` into `testnet.json`. Share secret keys privately (never commit them).
- [ ] **Thu Nov 5 → H4.** `scripts/deploy.sh`: builds, deploys with constructor args (admin, tokenContractId, 60, 3), calls `add_creditor(creditor)`, writes `contractId` and `deployedAt` into `testnet.json`, then runs `stellar contract bindings typescript` into `packages/laya-bindings`. Open the generated file and tell Abdullah exactly how enums and `RemitResult` came out.
- [ ] **Fri Nov 6.** Pair with Abdullah until `smoke.ts` passes (H5).
- [ ] **Sat Nov 7.** `scripts/demo-reset.sh`: tops worker back up to 2,000 and funder to 10,000, calls `set_period(60, 3)`. Run it before every demo.
- [ ] **Nov 8–11.** Hardening: more tests, check TTL extension, help Ananya and Luke debug contract errors, write a 5-line "how the contract works" explainer for the pitch.
- [ ] **Nov 12 on.** Code freeze. Only bug fixes, each with a test.

**Done means:** `cargo test` passes all golden numbers and error cases, the contract is live on testnet with the creditor registered, `testnet.json` is complete, and bindings are committed.

**You wait on:** nobody. **Others wait on you:** H2 (Nov 4) and H4 (Nov 5).

## Person 2, Abdullah: integration layer, wallets and hosting

You own the bridge between the pages and Stellar: the shared types, the mock client, the real client, the wallet hooks and the hosted app. Your first deliverable (H0, tonight) unblocks Ananya and Luke, so do it first.

**Paste this into your Claude**

```text
I'm Abdullah, Person 2 on a 4-person hackathon team building "Laya" on Stellar testnet.
The attached doc is our spec. "Shared contract B" defines types.ts and the LayaClient
interface exactly; implement them with exactly those names. "Shared contract A" is the
Soroban contract I call. The real client is the ONLY place that translates contract
formats (snake_case, enum numbers, u64, Buffer) into app formats. Follow the translation
table exactly. My files: app/src/lib/** and app/scripts/smoke.ts. Never edit files owned
by others. If the spec is ambiguous, stop and ask me. Start with the Next.js skeleton,
types.ts, units.ts, formulas.ts (must reproduce the golden numbers), hash.ts, and a
MockLayaClient that behaves exactly like the contract rules, including time passing.
```

**Tasks**

- [ ] **Tue Nov 3 → H0 (11 PM).** Create the repo and the layout from Shared contract B. Next.js + TypeScript + Tailwind + shadcn/ui initialized. Commit `types.ts`, `units.ts`, `formulas.ts` (with tests for the golden numbers), `hash.ts`, `config.ts` (reads a placeholder `testnet.json` with the exact shape above), `useLaya`, `useWallet`.
- [ ] **Tue Nov 3 → H0.** `MockLayaClient`: in-memory state, same rules and errors as the contract (throws `LayaError` with the same codes), ids from 1, fake tx hashes, and real time for missed periods using `Date.now()` and `periodSecs = 60`. A `?role=worker|funder|creditor|admin|family` URL parameter sets the mock's connected address, so Ananya and Luke can test every role without Freighter.
- [ ] **Wed Nov 4.** Freighter: `connect()` with `requestAccess` and `getAddress`, check the network is Testnet and show a clear error if not. Validate addresses with the SDK's StrKey helpers, not a "starts with G" check (Protocol 30 adds W-addresses), and don't let display helpers assume a G prefix. `getBalance` and `hasTrustline` via Horizon.
- [ ] **Thu Nov 5.** Start `RealLayaClient` against the signatures in Shared contract A (writes: build with the bindings `Client` using `publicKey` and Freighter's `signTransaction`, then `signAndSend()`; reads: `.result`). Error mapping to `LayaError`.
- [ ] **Fri Nov 6 → H5 (hard checkpoint, 9 PM).** Switch to Murad's generated bindings. `app/scripts/smoke.ts` runs request → confirm → fund → remit → read loan on testnet using the secret keys from `.env.local`, and prints the golden numbers. Then tell the team to set `NEXT_PUBLIC_USE_MOCK=false`.
- [ ] **Sat Nov 7.** `getEvents`: read `getHealth` for the oldest ledger, never request older; map the 5 event types to `LayaEvent`; return `[]` on any failure. The pages must work with no events.
- [ ] **Sun Nov 8.** Fix integration bugs reported by Ananya and Luke (H6).
- [ ] **Mon Nov 9 → H7.** Deploy to Vercel (`bindings` package in `transpilePackages`, `buffer` polyfill), test on a phone and a second laptop.
- [ ] **Nov 10–11.** Loading states and friendly messages for every `LayaError` code (one table in `lib/errors.ts`). Help wherever the team is behind.
- [ ] **Nov 12 on.** Code freeze, bug fixes only. You present the "how it works" part of the demo.

**Done means:** both clients implement every `LayaClient` method; the mock and the real chain give the same numbers; `smoke.ts` passes; the app is live on Vercel.

**You wait on:** Murad's H2 (Nov 4) and H4 (Nov 5). Until then, build against the spec. **Others wait on you:** H0 (tonight), H5 (Nov 6), H7 (Nov 9).

## Person 3, Ananya: worker and family app

You own the screens the story is told through: Maria the worker and her mother. You also own the shared UI components Luke reuses. You build against the mock from day 1 and never touch Stellar code directly.

**Paste this into your Claude**

```text
I'm Ananya, Person 3 on a 4-person hackathon team building "Laya" on Stellar testnet.
The attached doc is our spec. I build UI only: I call Stellar exclusively through
useLaya() and the LayaClient interface in "Shared contract B", and use helpers from
app/src/lib (units.ts, formulas.ts, hash.ts, useWallet). Never import @stellar packages
in my pages. Use the exact type and field names from types.ts. My files:
app/src/components/** and app/src/app/worker/**, app/src/app/family/**. Never edit
others' files. Stack: Next.js App Router, TypeScript, Tailwind, shadcn/ui. Mobile-first.
Every write shows a loading state, then the tx link or a friendly LayaError message.
If the spec is ambiguous, stop and ask me.
```

**Pages and components**

- **Shared components** (`app/src/components/`, H3 by Thu Nov 5): `PageShell` (header with role, connected address, Testnet badge), `AmountDisplay` (USD with PHP underneath using `PHP_PER_USD`, labeled illustrative), `TxLink` (stellar.expert link from `explorerTxUrl`), `RoleGuard` (shows "Switch Freighter to the Worker account" if `useWallet().role` doesn't match), `StatusBadge` (Open, Confirmed, Funded, Cancelled, Active, Repaid, Paused, Overdue).
- **`/worker/request`**: form with creditor (dropdown from `creditors.json`, only addresses where `isCreditor` is true), amount borrowed in USD with PHP shown, months (1–60), share slider (1%–15%, default 15%), family address (prefilled from `testnet.json`), file upload (hash with `hashFile`, file never leaves the browser), and old-loan inputs (annual rate %, monthly payment in PHP) saved to `laya:oldloan:<requestId>`. Live preview of the legal amount with `formulas.legalAmount`. Submit calls `requestPayoff`. Show the request status afterwards, and a Cancel button while Open or Confirmed.
- **`/worker`** (dashboard): the worker's loans from `listLoans()` filtered by worker address. For each: status (Active, Repaid, **Paused n of 3** when `missedPeriods > 0`, Overdue), outstanding, total repaid, total sent to family, share (slider that can't go below `minShareBps`, calls `setShare`).
- **Send home** (on `/worker`): amount input, preview of the split with `formulas.split` before signing, then `remit`. Result card: "60.00 to Bayanihan Microfinance, 340.00 to Lorna", new outstanding, tx link. No animation needed.
- **Old loan vs Laya card** (on `/worker`): static numbers only. Shows what the old loan would add this month at its rate versus 0 added on Laya during a pause. Label it "illustrative".
- **`/family`**: Lorna's balance (`getBalance`), total received from Maria (sum of `totalToFamily` over loans where family is this address), and a short explanation. No signing.

**Tasks**

- [ ] **Tue Nov 3.** Read the spec. Wait for H0 tonight, then set up shadcn/ui and sketch all pages.
- [ ] **Wed Nov 4.** `/worker/request` working on the mock (use `?role=worker`).
- [ ] **Thu Nov 5 → H3.** Shared components committed; tell Luke.
- [ ] **Fri Nov 6.** `/worker` dashboard, send home, share slider, pause status on the mock (wait 60 s to see Paused).
- [ ] **Sat Nov 7.** `/family` and the old-loan card. Switch to the real chain after H5.
- [ ] **Sun Nov 8 → H6.** Run demo steps 1, 5, 6 and 7 on testnet with Freighter. Report any client bug to Abdullah with the exact error.
- [ ] **Nov 9–11.** Polish: mobile layout, empty states, error messages, consistent copy.
- [ ] **Nov 12 on.** Freeze. You present the Maria story part of the demo.

**Done means:** demo steps 1, 5, 6 and 7 run on testnet without help, on a phone-sized screen.

**You wait on:** Abdullah's H0 (tonight) and H5 (Nov 6); Luke's H1 (Nov 4). Until then use the mock and placeholders. **Others wait on you:** H3 (Nov 5, Luke).

## Person 4, Luke: funder, creditor, proof, admin and pitch

You own the other side of the market (funder and creditor), the public proof page judges will remember, the demo data, and the pitch. You build against the mock from day 1.

**Paste this into your Claude**

```text
I'm Luke, Person 4 on a 4-person hackathon team building "Laya" on Stellar testnet.
The attached doc is our spec. I build UI only: I call Stellar exclusively through
useLaya() and the LayaClient interface in "Shared contract B", and use helpers from
app/src/lib. Never import @stellar packages in my pages. Use exact type and field names
from types.ts. My files: app/src/app/funder/**, creditor/**, proof/[id]/**, admin/**,
app/src/data/**, app/public/samples/**. Reuse Ananya's components from
app/src/components once available. Never edit others' files. Stack: Next.js App Router,
TypeScript, Tailwind, shadcn/ui. If the spec is ambiguous, stop and ask me.
```

**Pages and files**

- **Demo data** (H1, Wed Nov 4): `creditors.json`, `people.json` exactly as in Shared contract B (fill the creditor address from `testnet.json` after H2), and `public/samples/sample-loan-contract.pdf`: a one-page fictional loan contract (QuickPeso Lending Corp, ₱50,000, 12 months, 54% a year), stamped "SAMPLE – FICTIONAL".
- **`/creditor`**: requests where `creditor` is the connected address. For each Open request: amount borrowed, months, legal amount with the calculation spelled out ("860.00 + 8% × 12/12 = 928.80"), and an **Accept settlement** button that calls `confirmRequest`. Text above the button: "By accepting, you agree this payment settles the debt in full."
- **`/funder`**: two tabs.
  - **Requests:** Confirmed requests with worker name (from `people.json`), creditor name and registration, legal amount, share, and the projected payoff time (outstanding ÷ (share × a typical 400 USDC remittance), labeled as an estimate). A **Verify document** box: drop a file, hash it with `hashFile`, show ✓ match or ✗ mismatch against `docHash`. Fund form: Mode (Loan or Grant), fee (0–8% for Loan, fixed 0 for Grant), then `fundRequest`.
  - **Portfolio:** loans where `funder` is the connected address: outstanding, repaid, remit count, status (Active, Repaid, Paused n of 3, **Overdue** in red), and a link to the proof page.
- **`/proof/[id]`** (public, no wallet needed): reads `getRequest` and `getLoan` only (never depends on events). Shows: debt retired, creditor and registration, legal amount and its calculation, creditor accepted at (time), funded by and mode, document fingerprint, a Verify document box, and stellar.expert links. Under the fingerprint, one line on what it proves: the document is unchanged since the request, and with the creditor's acceptance and the payment it shows the settlement happened. It does not prove the original document was genuine. If `getEvents` returns events, show them as an optional timeline.
- **`/admin`**: list registered creditors; add one (checks `hasTrustline` first and refuses without it); set period (seconds) and max pause. Signed with the admin account.

**Pitch work**

- Deck (3 minutes): story (Maria) → problem with the 578% vs 8% number → live demo → how it works on Stellar → who pays (fair lenders, employer remediation funds) → honest limits → traction → ask. Use only the evidence in the Sources section.
- Outreach: email Migrasia, the Center for Migrant Advocacy and one Philippine microfinance group or co-op by Wed Nov 4, asking one question: "Would a licensed lender accept full payment at the legal rate to settle an overcharged recruitment loan?" Any reply goes on a slide.
- Backup video: screen-record the whole demo script once it works on testnet (by Fri Nov 13).

**Tasks**

- [ ] **Tue Nov 3.** Read the spec, start the deck outline, send outreach emails. After H0, set up your page folders.
- [ ] **Wed Nov 4 → H1.** Demo data and sample PDF committed.
- [ ] **Thu Nov 5.** `/creditor` and `/funder` Requests tab on the mock (`?role=creditor`, `?role=funder`).
- [ ] **Fri Nov 6.** Funder Portfolio and `/proof/[id]` on the mock.
- [ ] **Sat Nov 7.** `/admin`. Switch to the real chain after H5; swap in Ananya's components.
- [ ] **Sun Nov 8 → H6.** Run demo steps 2, 3, 4 and 8 on testnet.
- [ ] **Nov 9–11.** Deck v1 (Nov 10), deck v2 after a mentor's feedback (Nov 11).
- [ ] **Nov 12–15.** Freeze; backup video; run two full rehearsals with the team asking judge questions.

**Done means:** demo steps 2, 3, 4 and 8 run on testnet; the proof page works with no wallet; deck and backup video are ready.

**You wait on:** Abdullah's H0 (tonight) and H5 (Nov 6); Murad's H2 for the creditor address; Ananya's H3 (Nov 5). Until then use the mock and plain shadcn components. **Others wait on you:** H1 (Nov 4, Ananya).

## Team schedule and checkpoints

The one date that matters most is **Friday Nov 6, 9 PM**: the full flow must run on testnet. Confirm the Top 16 submission deadline with the organizers; if it's earlier than Nov 12, move the freeze.

| Date | Team checkpoint |
| --- | --- |
| Tue Nov 3 | Everyone reads this doc. Protocol 30 testnet vote at noon Toronto time; install SDKs after it. H0 by 11 PM. |
| Wed Nov 4 | H1, H2. Contract compiles with all tests. Outreach emails sent. |
| Thu Nov 5 | H3, H4. Contract live on testnet. |
| **Fri Nov 6, 9 PM** | **H5, hard checkpoint:** request → confirm → fund → remit on testnet. If missed, team call that night (see "If a handoff slips"). |
| Sat Nov 7 – Sun Nov 8 | All pages on the real chain (H6). First full run of the demo script. |
| Mon Nov 9 | Hosted on Vercel (H7). Show it to a mentor. |
| Tue Nov 10 – Wed Nov 11 | Polish, error messages, deck v1 and v2. |
| Thu Nov 12 | **Feature freeze.** Submit whatever the Top 16 cut requires. |
| Fri Nov 13 – Sun Nov 15 | Test on other laptops and a phone. Backup video. Two full rehearsals with judge questions. |
| Mon Nov 16 | Top 16 showcase. Run demo-reset an hour before. |
| Tue Nov 17 | Fixes from showcase feedback only. Cut pitch to 3 minutes. |
| Wed Nov 18 | Finals, 5 PM. Run demo-reset an hour before. |

**Daily habit:** a 10-minute check-in each night: what's done, what's blocking, which handoff is next. Merge to `main` at least once a day; small pull requests, each reviewed by one teammate.

## Judge Q&A every teammate must know

Everyone should be able to give these answers in one or two sentences.

- **"Why would the old lender accept less?"** They don't accept less than the law allows. They get the full legal amount, paid immediately, and sign acceptance on-chain. Lending above 8% a year for legal placement fees counts as illegal recruitment under RA 10022, so a lender who refuses risks a complaint to the Department of Migrant Workers.
- **"Why would anyone fund this if banks won't?"** Banks can't see foreign income and can't collect across borders cheaply. Here, repayment comes from remittances the worker sends through Laya, split in the same transaction. Employers and brands already spend money repaying recruitment fees (e.g. $1.07M in one case) and need proof.
- **"What stops the worker switching to another remittance service?"** Nothing in the contract forces it. What keeps them: access to their next loan, a public repayment record, and the funder's normal off-chain follow-up. Pauses are capped at 3 periods before the loan is flagged.
- **"How do you know the debt is real?"** Only registered lenders can be paid, the lender must sign that the payoff settles the debt, and the funder can verify the document against its fingerprint. The fingerprint alone only proves the document wasn't changed. For grants, the employer checks the amount against its own records before funding, so a worker and lender can't inflate it together.
- **"Why Stellar?"** One transaction splits a payment between three parties in different countries who share no bank, for a fraction of a cent, and the settlement receipt is publicly verifiable. A bank could do the split; it can't give a brand or auditor independent proof.
- **"Isn't taking a share of remittances predatory?"** The worker chooses 1% to 15%, it can't rise without their signature, the family always receives the rest, and the cost is the 8% benchmark plus the funder's flat fee of at most 8%.
- **"Can she lower her share if her income drops?"** Her payment already falls when she sends less, because the share is a percentage, and stops when she sends nothing. She picks the share before funding and can raise it any time; lowering it needs the funder's agreement (roadmap).
- **"How do you make money?"** A small fee per retired debt, paid by the funder, and later a per-transfer fee. Never a fee on a pause.
- **"Is this legal?"** Testnet only today. In production we run as software on licensed partners: a licensed lender, a registered remittance partner, and cash-out through MoneyGram, which already supports Stellar USDC cash pickup in the Philippines.
- **"Has this been done?"** Remittance-linked loans exist (Sri Lanka's DFCC Manusavi) and remittance credit-score projects exist on Stellar. We found no product that retires recruitment debt at its legal value with the lender's signed acceptance and flexible remittance-split repayment.

## Sources

**Problem evidence**

- [PCIJ: Migrasia survey, OFWs forced into loans](https://pcij.org/2023/07/21/ofws-are-harassed-jessica-got-jail-time-over-loans-theyre-forced-to-make-to-get-jobs-abroad/)
- [BHRRC: recruiters and lenders exploiting OFWs (61–578% rates)](https://www.bhrrc.org/de/neuste-meldungen/philippines-recruitment-agencies-and-lenders-collude-to-exploit-migrant-workers-amid-lack-of-govt-action-to-tackle-abuse/)
- [Alburo Law: prohibited practices and the 8% cap under RA 10022](https://www.alburolaw.com/what-are-the-prohibited-practices-in-conducting-recruitment-for-overseas-employment/)
- [Rappler: OFW borrowed ₱50k, repaid ₱76.8k](https://www.rappler.com/newsbreak/iq/178956-ofw-placement-fees-scam-solution)
- [World Bank: labor migration costs](https://blogs.worldbank.org/en/peoplemove/labor-migration-costs-too-high-low-skilled-workers)
- [Lim & Visaria: Filipino domestic workers in Hong Kong](https://openaccess.city.ac.uk/31608/8/lim-visaria-2020-the-borrowing-puzzle-why-do-filipino-domestic-workers-in-hong-kong-china-borrow-rather-than-dissave.pdf)
- [Manila Bulletin: proposed interest-free pre-departure loans](https://mb.com.ph/2026/02/22/erwin-tulfo-pushes-for-interest-free-pre-departure-loans-for-ofws)

**Who already pays to fix it**

- [Impactt and Rabobank: Remediation Bond](https://impacttlimited.com/remediationbond/)
- [Transparentem: $1.07M recruitment-fee reimbursement](https://transparentem.org/?p=1819)
- [Unilever: lessons from fee repayment](https://www.unilever.com/files/impact-of-fee-repayment-lessons-and-findings-unilever.pdf)
- [ImpactAlpha: impact funds for people on the move](https://impactalpha.com/migration-surge-spurs-impact-funds-to-target-financial-services-for-people-on-the-move/)
- [DFCC Manusavi: remittance-repaid loan](https://www.dfcc.lk/manusavi-loan-scheme)

**Stellar and regulation**

- [Stellar: Bell, Protocol 30 upgrade guide](https://stellar.org/es/blog/desarrolladores/bell-protocol-30-upgrade-guide)
- [Stellar docs: getEvents (retention window)](https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getEvents.md)
- [Stellar docs: custom types](https://developers.stellar.org/docs/learn/fundamentals/contract-development/types/custom-types.md)
- [soroban-sdk: migrating to #\[contractevent\]](https://docs.rs/soroban-sdk/27.0.4/src/soroban_sdk/_migrating/v23_contractevent.rs.html)
- [Stellar JS SDK: contract module](https://stellar.github.io/js-stellar-sdk/module-contract.html)
- [Stellar docs: Stellar Asset Contract](https://developers.stellar.org/docs/smart-contracts/tokens/stellar-asset-contract)
- [Fintech News PH: MoneyGram crypto-to-cash in the Philippines](https://fintechnews.ph/56101/remittance/moneygram-launches-global-crypto-to-cash-service-in-the-philippines/)
- [Fintech News PH: BSP freeze on new VASP licences](https://fintechnews.ph/68110/crypto/bsp-extends-moratorium-on-new-vasp-licenses-indefinitely/)
- [Velocity: challenge page](https://www.velocityincubator.com/programs-events/the-blockchain-innovation-challenge-powered-by-stellar)
