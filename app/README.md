# Solstice app

Solstice sorts fictional pre-departure bills by who should pay. An employer can cover a bill by paying the provider directly. A lender can finance a worker's eligible bill, and the worker can repay part of the loan with each remittance sent through Solstice.

## Run locally

Clone the full repository so that the app can use the sibling [contract bindings](../packages/laya-bindings/). The app requires Node.js 20.9 or newer. The unit tests and mock smoke flow were checked with Node.js 24.16.0 and npm 11.13.0.

```sh
cd app
npm ci
npm run dev
```

Open [the local app](http://localhost:3000). The checked-in app configuration starts in mock mode. Open [the demo runner](http://localhost:3000/dev) to step through the flow without a wallet. The home page also links to the individual role screens. In mock mode, their `?role=` parameters switch demo accounts. Use **Reset mock** on the demo runner for a clean run.

## Walk through the demo

1. **Sort the bills.** The worker enters the amounts and selects the sample invoices. The demo routes a hypothetical 190-unit training charge to financing and a 65-unit medical exam to the employer. It refuses a sample placement fee charged by a Philippine recruiter to a Filipino domestic worker. See the [bill evidence](../agents/artifacts/solstice-demo-bill-evidence.md) for the scope of these examples.
2. **Pay the providers.** The training provider confirms the invoice and the lender pays the provider 190 directly. A 3% flat fee adds 5.70, so the worker owes 195.70. The employer can pay the clinic 65 as a grant with zero repayment.
3. **Send money home.** The worker sends 400 with a 15% repayment share. The family gets 340, the lender gets 60, and the outstanding balance falls to 135.70.
4. **Inspect the receipt.** Open `/proof/<request-id>` for the funded training request. It shows the provider, current balance, and available event history. On Testnet, use the transaction links to verify the provider payment and remittance.

## Use Stellar Testnet

Set `NEXT_PUBLIC_USE_MOCK=false` in `app/.env.local`, then restart the dev server. For a deployment, set it before building the app. Testnet write actions require Freighter on Testnet with the corresponding configured demo account and sufficient test balances. The role links switch accounts only in mock mode. A Testnet receipt can be read without connecting a wallet when you have the funded request ID.

| Configured Testnet resource | Identifier |
| --- | --- |
| Solstice contract | [`CCQ2LMIEGRCWT5YV4DPCR2VGNP76DVYVPD5KJMCFJILZ7FMX37LL4KS3`](https://stellar.expert/explorer/testnet/contract/CCQ2LMIEGRCWT5YV4DPCR2VGNP76DVYVPD5KJMCFJILZ7FMX37LL4KS3) |
| Demo asset | `USDC`, issued by `GDNQF5BVXTLANBL5WGRTYIF2XJFFHS5G33G7HMDMKJ4FZB7GEYGAO7N3` |
| Demo asset contract | `CAWWECWMEOJJE25IYYSDIOYTWCOW2R7S5NDGQISERK2U7GKI2UZYPEIW` |

The [checked-in Testnet configuration](src/config/testnet.json) lists the endpoints and public demo accounts. A previous Testnet run recorded a [190 test USDC payment to the training provider](https://stellar.expert/explorer/testnet/tx/7a201a59249a5802b096494e61928713199612b6291f233b0645e11becff784c) for request 13 and a [65 test USDC employer payment to the clinic](https://stellar.expert/explorer/testnet/tx/a2d86b7f49f9208eec91ac34133ec9e7e4dec28d6d4087fcbe5ed4d35179dfc6) for request 14. The [400 test USDC remittance](https://stellar.expert/explorer/testnet/tx/0e07bb9956d1e4fb301fc841b1838216da8b958b31fc071ec88423395daf22bf) sent 340 to family and 60 to the lender, leaving 135.70 owed on loan 13. In Testnet mode, open `/proof/13` to read that loan in the app.

## Why Stellar

The [Soroban contract](../contracts/laya/src/lib.rs) pays providers directly and records the amount owed. When a worker sends money through Solstice, the contract sends the family and lender their shares and updates the loan balance in one transaction. This lets a reviewer trace both transfers to the same repayment.

The app uses [Stellar RPC through the contract client](src/lib/client/real.ts) and [Horizon for account and asset information](src/lib/client/horizon.ts). Bill classification and provider labels come from app data. The worker enters the bill details manually. The browser keeps the invoice file local and computes a fingerprint that the contract stores. The receipt can check whether a separately supplied file matches the fingerprint. The provider can confirm the submitted amount against its own records. See the [invoice intake notes](../agents/artifacts/solstice-invoice-intake.md) for the pilot workflow.

## Prototype boundaries

Use fictional records and test tokens. Request and payment information on Testnet is public. Keep wallet secrets out of the repository and browser configuration.

Production work includes worker approval of the final fee before funding, stronger enforcement of payer policy, and integration with a licensed payments partner where applicable. Partner onboarding, identity checks, and operational monitoring would need to be designed and validated before handling real funds.

## Development checks

Run these commands from `app/`.

```sh
npm test
npm run smoke:mock
npm run build
```

Run `npm run smoke:real -- --reads` to check the configured contract on Testnet without keys. Running `npm run smoke:real` without `--reads` sends transactions using team-controlled test accounts. Authorized operators can use [.env.example](.env.example) as the variable-name reference and keep the test keys in their ignored `.env.local`.
