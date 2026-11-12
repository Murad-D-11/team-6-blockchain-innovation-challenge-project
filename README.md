# Solstice

Solstice pays a migrant domestic worker's pre-departure bills straight to the clinic and training centre, so she never needs a high-interest lender. A remittance partner funds the bills, and she repays a capped share of each transfer she sends home. The money rules are locked in a Soroban smart contract on Stellar.

Built for Velocity's Blockchain Innovation Challenge powered by Stellar (Nov 2026), problem space 1: Access to Fair Financial Assets and Affordable Financing.

**Stellar testnet only. All people are fictional and all money is test USDC.**

## Try it

| What | Link |
| --- | --- |
| Live app (real testnet) | https://team-6-blockchain-innovation-challe.vercel.app |
| Public receipt, no wallet needed | https://team-6-blockchain-innovation-challe.vercel.app/proof/17 |
| Solstice contract (Soroban, code name Laya) | [`CCQ2LMIEGRCWT5YV4DPCR2VGNP76DVYVPD5KJMCFJILZ7FMX37LL4KS3`](https://stellar.expert/explorer/testnet/contract/CCQ2LMIEGRCWT5YV4DPCR2VGNP76DVYVPD5KJMCFJILZ7FMX37LL4KS3) |
| Test USDC token contract | [`CAWWECWMEOJJE25IYYSDIOYTWCOW2R7S5NDGQISERK2U7GKI2UZYPEIW`](https://stellar.expert/explorer/testnet/contract/CAWWECWMEOJJE25IYYSDIOYTWCOW2R7S5NDGQISERK2U7GKI2UZYPEIW) |

The contract is redeployed fresh before each judging day, so receipt numbers can change. The current contract ID is always in [`app/src/config/testnet.json`](app/src/config/testnet.json).

To act as a role on the live app, install the [Freighter](https://www.freighter.app/) wallet, set it to **Testnet**, and import the matching demo account. Reading a public receipt needs no wallet.

## How it works

1. **Maria (worker)** lists her bills: training (190 USDC), a medical exam (65 USDC) and a placement fee. The app checks each bill against the funder's policy and refuses the placement fee.
2. **The providers** (training centre and clinic) confirm the exact amount of their own bill on-chain.
3. **The funder** (in production, a remittance company) pays the training centre 190 directly, at a 3% one-time fee, so Maria owes 195.70. **The employer** can optionally pay the 65 medical exam it already owes, and Maria owes 0 for it.
4. **Every month** Maria sends money home. Each transfer splits in one transaction: for example, 400 at a 15% share sends 60 to the funder and 340 to her mother, Lorna. Maria now owes 135.70.
5. **Anyone** can open the public receipt and check every payment on Stellar Expert.

## What the contract enforces, and what the app checks

| Rule | Enforced by |
| --- | --- |
| Only the worker can send money. The funder can never pull money from her | Contract (`remit` needs the worker's signature) |
| Repayment share is at most 15% and never below the share agreed at funding | Contract (`set_share`, `min_share_bps`) |
| Loan fee is at most 8%, locked at funding. A grant has no fee | Contract (`fund_request`) |
| The funder never receives more than is owed | Contract (`remit` takes `min(share, outstanding)`) |
| Money goes only to a registered provider, after it confirms the exact amount | Contract (`request_payoff`, `confirm_request`) |
| Each bill can be paid only once | Contract (status Confirmed to Funded) |
| Each transfer pays the funder and the family in one transaction | Contract (`remit`) |
| Which bills the funder pays, and the most for each (the funder's policy) | App only (`app/src/lib/rulebook.ts`, `app/src/data/rulebook.json`) |

The document fingerprint on a receipt shows the invoice file is unchanged since the request. It does not prove the invoice is genuine.

## Architecture

For a wallet-free walkthrough and the Testnet contract configuration, see the [app guide](app/README.md). Older code and some screens use the project's earlier name, Laya.

- `contracts/laya/`: Soroban contract in Rust (soroban-sdk), with unit, golden-number and error-code tests.
- `packages/laya-bindings/`: TypeScript bindings generated from the contract.
- `app/`: Next.js 16 (App Router), TypeScript, Tailwind and Vitest.
  - `app/src/lib/client/real.ts` talks to Stellar RPC and Horizon. It is the only file that translates contract formats.
  - `app/src/lib/client/mock.ts` is an in-browser mock of the same interface, so the whole demo runs with no wallet.
  - Pages use only the `useLaya()` hook and never import Stellar packages directly.
- `scripts/`: testnet setup, deploy, demo reset and fresh redeploy (`redeploy-demo.sh`).

Money is a `bigint` with 7 decimals (1 USDC = 10,000,000 units).

## Run it locally

Prerequisites: Node.js 20 or newer and npm. Rust and the Stellar CLI are needed only to rebuild or redeploy the contract.

```bash
cd app
npm install
npm run dev
```

Open http://localhost:3000. By default the app runs in **mock mode** (`NEXT_PUBLIC_USE_MOCK=true` in `app/.env`): no wallet or network needed. Add `?role=worker` (or `funder`, `creditor`, `clinic`, `employer`, `family`, `admin`) to a URL to act as that account, and `?mockReset=1` to start clean.

**Real testnet mode:** create `app/.env.local` with `NEXT_PUBLIC_USE_MOCK=false`, restart `npm run dev`, and connect Freighter on Testnet. For the scripted end-to-end check, copy `app/.env.example` to `app/.env.local`, fill in the demo accounts' testnet secret keys (never commit them), and run `npm run smoke:real`. `npm run smoke:real -- --reads` runs read-only checks with no keys.

**Tests and build:**

```bash
cd app
npm test
npm run build
```

Contract tests: `cd contracts/laya && cargo test`.

**Expected result of the demo run:** funding the 190 USDC training bill at 3% leaves 195.70 owed; a 400 USDC transfer at a 15% share pays 60 to the funder and 340 to the family, leaving 135.70 owed; funding the 65 USDC exam as the employer leaves 0 owed.

## Limits (we say these ourselves)

- Recruiters can still demand cash outside Solstice. Solstice records only what runs through it.
- The funder's policy is checked by the app, not the contract.
- No remittance company or employer has signed up. Production needs a licensed lending partner, KYC by that partner, and a cash-out partner in the Philippines.
- In this prototype the funder sets the fee at funding. In production the worker would approve the full cost first.

## Team

Abdullah, Murad, Ananya and Luke, University of Waterloo.
