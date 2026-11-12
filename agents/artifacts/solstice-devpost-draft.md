# Solstice Devpost draft

Working copy. Replace the bracketed fields with verified links and IDs before pasting. See the [production checklist](solstice-devpost-production.md) for what to verify.

## Paste into Devpost

- **Project name** · Solstice
- **Tagline** · Send money home and pay down a loan in one step.
- **Built with** · Stellar, Soroban, Rust, Next.js, TypeScript

- [One-minute prototype demo]([PUBLIC_VIDEO_URL])
- [Open the Solstice receipt without a wallet]([PUBLIC_RECEIPT_URL]) and [check the Stellar transaction]([TESTNET_TRANSACTION_URL])
- [Open the Stellar Testnet app]([PUBLIC_APP_URL])
- [Source and setup instructions]([PUBLIC_REPOSITORY_URL])
- **Testnet contract** · `[VERIFIED_CONTRACT_ID]`

### Who it serves

Maria is a fictional Filipino domestic worker preparing to work in Hong Kong. Her first paycheck is weeks away, but a training invoice is due now. Before she borrows, she needs to know which bills are hers to pay and what a loan would cost. After she starts earning, she needs to send money home while paying down that debt.

Solstice is designed to help Filipino domestic workers heading to Hong Kong sort pre-departure bills before borrowing, pay providers directly, and repay eligible financing through a chosen share of remittances sent through the app.

### How it works

1. **Request financing.** Maria enters a fictional training bill and submits a request to have the provider paid directly.
2. **Pay the provider.** The school confirms a training invoice for 190 test units. A lender pays the school directly. The illustrative 3% flat fee adds 5.70, bringing the total owed to 195.70.
3. **Send money home and pay down the loan.** With her repayment share set to 15%, Maria sends 400 test units through Solstice. Her family gets 340, the lender gets 60, and her outstanding balance drops to 135.70. The fee sets the cost of this example loan. The repayment share sets how much of a transfer goes toward the balance.

### Why Stellar

The app applies the bill rules. The Soroban contract handles the lender’s direct payment to the provider. When Maria sends money home through Solstice, one Stellar transaction sends the two payments and reduces the loan balance. The lender and family can check the transfers against the same transaction record. The provider’s invoice confirmation and the transaction record answer different questions: who confirmed the bill and where the money went.

### What we built and how to verify it

The prototype uses fictional invoices, demo accounts and Testnet funds. Open the Solstice receipt for the remaining balance and the Stellar transaction for the transfers of 340 and 60. The worker, provider and lender screens use configured demo wallets. The repository explains how to run the app.

### What we learned

In simulation, a 400-unit transfer at 15% produced a 340 family payout, a 60 lender payment and 135.70 still owed. We still need feedback from the workers this is designed for. Our next usability check asks a participant to predict the family payout, lender payment and remaining balance before confirming a transfer. We’ll use what they get stuck on to revise the screen and retest it.

### What we would test next

The split applies to payments made through Solstice. A transfer through another service leaves this balance unchanged. We would test whether workers prefer the combined payment after accounting for fees and how families receive the money, and whether a lender would fund the bill before departure. For a pilot, we would track how much workers pay out of pocket before their first paycheck and the total cost of financing and transfers. A lender or remittance provider covering servicing costs is a possible model to test alongside partner requirements for payouts, currency conversion and missed payments.

## Team notes

- If the video starts with an already-funded loan, name that setup in “What we built and how to verify it” and say which action was recorded live.
- If the video includes bill sorting, describe the observed decisions. Include employer payment only if you verified the clinic payment.
- If a usability session happens, replace the planned check in “What we learned” with who tested, what happened, what changed and the retest result.

**Gallery order** · Training request or funded training loan, confirmed 340/60 split with remaining balance, then receipt with the transaction link. Use screenshots from the same run and synthetic data only.

**Source notes** · [Core flow](../context/core-flow.md) · [Pitch context](../context/pitch-context.md) · [Devpost submission plan](../context/devpost-submission-plan.md) · [Advisor meeting and simulation note](solstice-advisor-meeting.md) · [Research decision](solstice-research-decision.md) · [Contract implementation](../../contracts/laya/src/lib.rs)
