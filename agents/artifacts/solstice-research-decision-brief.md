# Solstice research decision brief

November 8, 2026 · Recommendations for team discussion. [Research log and sources](research-log.md) · [Working PRD](solstice-prd.md)

## The product in plain English

Maria gets bills before her first paycheck. Solstice would help her check who should pay each bill and find an affordable way to cover any bill that is really hers. In the demo, a lender pays the training school directly, then Maria pays some of that loan back when she sends money home. The old lender receives nothing in this flow. The school bill and lender are fictional, and the full Testnet run still needs verification.

## Four straight answers

| Question | Best answer today | What we should do with it |
| --- | --- | --- |
| **Who puts up the 190?** | Budget Finance and Camalig Bank advertise products for first-time overseas workers. They’re interview leads. Budget requires a visa, ticket and Overseas Employment Certificate before it releases money. If the bill is due earlier, that product may arrive too late. Nobody has agreed to fund Solstice’s example. [Budget Finance](https://budgetfinance.ph/ofw-loan) · [Camalig Bank](https://www.camaligbank.com/ofw-loan) | Keep the lender fictional for the demo. Find out when a real bill comes due, then ask what a lender can approve and pay by that date. |
| **Can the lender make money?** | If Maria pays everything back, the lender has 5.70 to cover the work of approving and managing the loan and any money lost when people fail to repay. In a simple example where making the loan costs 2 and borrowers either pay in full or pay nothing, around 98 out of 100 must repay in full for the lender to break even. Actual costs and recoveries are unknown. [Calculation and assumptions](research-log.md#example-break-even-math) | Keep 3% as a demo input. Ask what total repayment a real lender would need, what drives the cost, and who would cover any gap. Solstice’s own costs are separate. |
| **Why use Solstice instead of going directly?** | Maria should take a cheaper option she can already get in time. Fair Employment Agency’s employer-paid package already includes the competency assessment fee for first-time workers from the Philippines, among other costs. Recruiter steering to expensive lenders is documented, but it’s one path workers face. [Fair Employment Agency](https://fairagency.org/helper-full-hire/) · [ICIJ investigation](https://www.icij.org/investigations/trafficking-inc/philippine-lenders-and-labor-agents-fleece-workers-seeking-overseas-jobs-interviews-and-confidential-documents-show/) | First confirm a bill that really falls on the worker after checking employer coverage and other options. Solstice earns a place if it can reach Maria before the bill is due and make the outcome better. |
| **Why Stellar?** | The contract has code for one transfer that pays the lender and family and updates the loan balance. The network gives a third party a way to check the transaction. Ordinary payment tools can also split payments, and Wise already moves money from Hong Kong to the Philippines. The value of independent verification and the total cost of delivering real money still need checking. [Contract](../../contracts/laya/src/lib.rs) · [Stellar transaction lookup](https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getTransaction) · [Stripe](https://docs.stripe.com/connect/separate-charges-and-transfers) · [Wise](https://wise.com/hk/send-money/send-money-to-philippines) | Show the exact Testnet transactions and have someone else verify them. Ask a prospective partner when a normal receipt would be insufficient. |

## What this changes

- **PRD.** Make the first question “Which bill is actually hers, and when is it due?” Confirm the amount, payer and deadline with a recent case before assuming a loan is necessary. If employer payment or a better direct offer covers it, test whether helping Maria reach that option is the useful part of Solstice.
- **Demo.** Keep the 190-unit loan as a worked example. Verify the school payment, 400-unit repayment split, and change in the balance from 195.70 to 135.70. Save exact transaction links and have a second person check the receipt. Keep the fee-acceptance gap visible. The worker signs the request and the lender selects the fee later in the current contract.
- **Pitch.** Use roughly two months of earnings as a historical recruitment-cost figure, with the 2019 survey and corridor stated. Describe lender participation as something the team needs to test. [ILO/PSA report](https://www.ilo.org/sites/default/files/2024-05/measuring-sustainable-development-goal-indicator-philippines-report-2023-en.pdf)

## Next round

1. **Worker or caseworker:** “Walk me through the last bill a first-time worker had to pay before leaving for Hong Kong. Who billed her, who was supposed to pay, when was it due, and what options were actually available that day?” A recent, de-identified example is enough to check whether the problem we drew matches a real case.
2. **Lender:** Bring that timeline and ask, “Could you pay this provider by that date for a first-time worker with these documents? How much would she pay back in total, and what would make you say no?” A written example quote would help compare the direct option with the proposed Solstice flow.
3. **Build owner:** Run the same loan from request to repayment on the version the team plans to submit. Record the result and test whether an independent reviewer can verify it.

For now, pitch the mechanism in conditional language. “Solstice helps a worker sort her bills before borrowing. Our prototype is designed to let a participating lender pay an eligible bill directly and let the worker repay part of it when she sends money home.” Use “our demo shows” for steps the team has verified.
