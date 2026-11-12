# Solstice

**Tagline** · Get pre-departure bills paid by the right party.

**Built with** · Stellar, Soroban, Rust, Next.js, TypeScript

## Inspiration

A job in Hong Kong can come with bills before the first paycheck. Hong Kong’s Labour Department describes how a domestic worker may pay expenses such as a medical exam upfront, then get reimbursed by the employer after showing receipts. An ILO and Philippine Statistics Authority analysis of 2019 survey data found that recruitment costs averaged **₱49,000** for Filipino domestic workers in Hong Kong. [Hong Kong Labour Department guide](https://www.fdh.labour.gov.hk/res/pdf/FDHguideEnglish.pdf#page=9) · [ILO/PSA recruitment cost report](https://www.ilo.org/sites/default/files/2024-05/measuring-sustainable-development-goal-indicator-philippines-report-2023-en.pdf#page=34)

That raised our starting question. **How much does a worker actually need to borrow once you check who owes each bill?**

## What it does

Solstice helps Filipino domestic workers heading to Hong Kong figure out who should pay their pre-departure bills. Employers can pay providers directly, lenders can fund eligible worker expenses, and workers can repay part of a loan when they send money home.

1. **Check who pays.** In our demo, Maria is a fictional worker. Solstice routes her medical exam to the employer, refuses to finance a placement fee charged by a Philippine recruiter, and lets her request financing for a hypothetical training bill. Philippine recruitment rules exempt domestic workers from placement fees. [Philippine Department of Migrant Workers rules, §§55–59](https://dmw.gov.ph/archives/v1/resources/dsms/DMW/ISN-EXT/2023/DMW-DC-01-2023.pdf)
2. **Pay the provider.** The school confirms the submitted amount and the lender pays the school **190 test USDC** directly. With the demo’s illustrative 3% flat fee, Maria owes **195.70**.
3. **Send money home.** Maria sends **400 test USDC** through Solstice with a 15% repayment share. Her family receives **340**, the lender receives **60**, and her balance falls to **135.70**.

## How we built it

We built the role-based app in Next.js and TypeScript and the payment contract in Rust on Stellar’s Soroban platform. The app applies bill rules to the details Maria enters. The contract records provider confirmation, pays providers directly, and handles repayment.

Stellar lets us put both transfers and the loan balance update in **one transaction**. The family and lender can trace their transfers to the same operation, and the lender’s share is capped at the outstanding balance.

## Challenges we ran into

We needed a way to link a bill to its payment record while keeping the invoice itself off the public ledger. The browser computes a fingerprint of the file and keeps the original local. The fingerprint lets someone with a copy check whether it matches the file selected at submission. The provider separately confirms the amount from its own records, and the transaction shows where the money went.

## Accomplishments that we're proud of

We ran both paths on Stellar Testnet. An employer paid **65 test USDC** directly to the clinic as a grant, with zero owed by the worker. In the separate training example, the lender paid the school directly, and Maria’s remittance paid her family and reduced her debt in the same transaction. These are historical runs using fictional bills and test funds. [Clinic payment](https://stellar.expert/explorer/testnet/tx/a2d86b7f49f9208eec91ac34133ec9e7e4dec28d6d4087fcbe5ed4d35179dfc6) · [Training payment](https://stellar.expert/explorer/testnet/tx/7a201a59249a5802b096494e61928713199612b6291f233b0645e11becff784c) · [Remittance split](https://stellar.expert/explorer/testnet/tx/0e07bb9956d1e4fb301fc841b1838216da8b958b31fc071ec88423395daf22bf) · [Testnet contract](https://stellar.expert/explorer/testnet/contract/CCQ2LMIEGRCWT5YV4DPCR2VGNP76DVYVPD5KJMCFJILZ7FMX37LL4KS3)

## What we learned

Existing services helped us narrow the idea. Fair Employment Agency already covers some upfront costs through its employer hiring package. Budget Finance offers loans to overseas Filipino workers but lists a visa, ticket, and Overseas Employment Certificate among its release requirements. The case we want to test is a legitimate bill that remains unpaid when it comes due, after employer coverage and other options are accounted for. [Fair Employment Agency package](https://fairagency.org/helper-full-hire/) · [Budget Finance OFW loan](https://budgetfinance.ph/ofw-loan)

## What's next for Solstice

We want to replay one real, anonymized bill with a provider and a licensed lender. We’ll compare who paid, when the money arrived, and how much the worker had to pay upfront or borrow under the options available at the time. On the repayment side, we’ll compare total costs at the same peso payout to the family and check what happens when the worker skips a transfer or uses another service.

Our first prospective customer is a lender already serving overseas Filipino workers. We’d test a per-loan servicing fee if provider confirmation, direct payment, and automatic repayment posting save the lender enough work. We’d look for a better outcome for the worker, such as earlier funding or lower total cost, before expanding beyond one bill type and one provider.

---

### Submission fields to fill before publishing

- **Video** · Add the public one-minute prototype video.
- **Source code** · Add the public GitHub repository with setup and run instructions.
- **Try it out** · Add the verified Testnet app URL and wallet-free receipt URL if available. Testnet contract ID: `CCQ2LMIEGRCWT5YV4DPCR2VGNP76DVYVPD5KJMCFJILZ7FMX37LL4KS3`.

Test the video, source, and app links while signed out. Paste the seven story sections into Devpost and enter the tagline, technology tags, and links in their dedicated fields. [Devpost submission fields](https://help.devpost.com/article/126-know-your-submission-steps) · [Challenge requirements](https://blockchain-stellar-ic.devpost.com/)
