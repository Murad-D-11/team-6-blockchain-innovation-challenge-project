# `app/src/lib` — Abdullah's integration layer (H0)

Pages never import `@stellar/*`. They use `useLaya()` and these helpers.

## Helpers

| File | What it does |
| --- | --- |
| `types.ts` | Shared contract B types, `LayaError`, `LayaClient`. Exact copy of the spec. |
| `units.ts` | `toUnits("190")` → `1_900_000_000n` (throws on empty, negative, letters, >7 decimals). `fromUnits(u, dp = 2)` → plain decimal string, **truncated, not rounded**. `fromUnits(1_957_000_000n)` → `"195.70"` (USDC). `formatUsd(u)` is `fromUnits` with a dollar sign and thousands separators, and `formatPhp(u)` converts at `PHP_PER_USD` (the 195.70 USDC loan is 11,350 pesos), both truncated. `PHP_PER_USD = 58` (label it "illustrative rate"). |
| `formulas.ts` | Bigint copies of the contract rules: `legalAmount(principal, months)` (v2: returns `principal`), `outstandingFor(legal, mode, feeBps)`, `split(amount, shareBps, outstanding)` → `{toLender, toFamily, outstanding}`, `missedPeriods({status, now, lastPaymentAt, periodSecs})`, `isOverdue(missed, maxPausePeriods)`. Also the limits (`MAX_FEE_BPS`, `MAX_SHARE_BPS`…). |
| `hash.ts` | `hashFile(file)` and `hashBytes(bytes)`: SHA-256, 64 lowercase hex. The file never leaves the browser. |
| `address.ts` | `isValidAccount(addr)` (SDK StrKey, no "G" prefix assumption), `shortAddress(addr)` → `"GAJE…F4JO"`. |
| `config.ts` | `config` = `config/testnet.json`, typed. |
| `roles.ts` | `roleOf(address)` (match against `config.accounts`; the creditor and clinic addresses both give `"creditor"`), `accountOf(role)` (also accepts the mock-only `"clinic"`). |
| `client/mock.ts` | `MockLayaClient`: same rules, validation and error codes as the contract. |
| `client/real.ts` | `RealLayaClient`: **stub**, every method throws `LayaError(0, "Real client not ready yet")` until H5. |
| `hooks/useLaya.ts` | One shared client: the mock when `NEXT_PUBLIC_USE_MOCK === "true"`, else the real one. |
| `hooks/useWallet.ts` | `{ address, role }`, updates when the connected address changes. |

## Using it in a page

```tsx
"use client";
import { useEffect, useState } from "react";
import { useLaya } from "@/lib/hooks/useLaya";
import { useWallet } from "@/lib/hooks/useWallet";
import { LayaError, type Loan } from "@/lib/types";
import { formatUsd, toUnits } from "@/lib/units";

export default function Example() {
  const laya = useLaya();
  const { address, role } = useWallet();   // role: "worker" | "family" | ... | "unknown"
  const [loans, setLoans] = useState<Loan[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { laya.listLoans().then(setLoans).catch((e) => setError(e.message)); }, [laya]);

  async function sendHome() {
    try {
      const r = await laya.remit({ loanId: loans[0].id, amount: toUnits("400") });
      alert(`${formatUsd(r.toLender)} to the funder, ${formatUsd(r.toFamily)} to family`);
    } catch (e) {
      setError(e instanceof LayaError ? e.message : "Something went wrong"); // e.code for the number
    }
  }
  return <button onClick={sendHome}>{role} {address}: send 400</button>;
}
```

Every call takes about 300 ms on the mock, so show a loading state.

## Mock tricks

- `?role=worker|family|funder|creditor|clinic|employer|admin` on any URL acts as that account. It is remembered for the browser tab (sessionStorage). With no role, the mock acts as the worker.
- `?mockReset=1` wipes the mock's saved state (when the page loads).
- `/dev` runs the v2 golden flow step by step (190 USDC training Loan at 300 bps, 65 USDC medical Grant) and has a **Reset mock** button.
- State lives in `localStorage` under `laya:mock:v2`, so a request made as the worker shows up for the creditor in another tab. Every call re-reads storage, so tabs stay in sync.
- Time is real (`Date.now()`), and a period is 60 s (`config.periodSecs`). Wait 60 s after funding to see **Paused 1 of 3**.

## Decisions (not spelled out in the spec)

- **Display truncates.** `fromUnits`, `formatUsd` and `formatPhp` truncate. 1,957,000,000 units shows as 195.70 USDC, and × 58 gives 11,350 pesos (illustrative). Only `formatUsd` and `formatPhp` add currency symbols and separators.
- **Error code 0** (wallet / not a contract error) in the mock:
  - `"Switch to the <Role> account to do this"`: the connected account isn't the one the contract would `require_auth` (confirm → Creditor; cancel, remit, set_share → Worker; add_creditor, set_period → Admin).
  - `"Not enough test USDC"`: a transfer would overdraw. Nothing is changed.
  - `"Invalid family address"`, `"Invalid document fingerprint"` (not 64 hex), `"Invalid account address"`, `"Invalid max pause periods"`: malformed input the contract can't even receive.
- **No signer check** on `requestPayoff` (the connected account *is* the worker) and `fundRequest` (the connected account *is* the funder), because the contract has nothing to compare.
- `remit` with `amount <= 0` → error 8 (the spec lists amount rules only for principal; this is my reading).
- Check order in `requestPayoff`: address/hash format, creditor (3), amount (8), months (9), share (7).
- Ids start at 1, a loan id equals its request id. Cancelled requests keep their id.
- `listRequests` / `listLoans` newest first. `getEvents` oldest first, optionally for one id. Events have the five spec types. `ledger` is fake and increasing.
- Mock `address()` is never `null`, so pages never see "disconnected" on the mock. The real client returns `null` before `connect()`.
- `useWallet` re-checks the address on a window event, on focus and every 500 ms, so a changed `?role=` shows up without a reload.
- Trustlines: true for worker, family, funder, creditor, clinic and employer; false for everyone else (the admin page can't add a new creditor on the mock, because a new address has no trustline).
- `tsconfig` target is ES2020 (bigint literals).

## Tests

`npm test` (Vitest). Includes every golden number from the spec in `formulas.test.ts` and `client/mock.test.ts`.
