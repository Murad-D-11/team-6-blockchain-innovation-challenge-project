# Should we pivot Solstice?

Decision draft · November 10, 2026

**For Friday, keep the demo if the real Testnet payment works. After Friday, pause the standalone app.** The problem is real. We still need a case where Solstice gets a bill paid on time, avoids debt, lowers total cost, or makes a tight month meaningfully easier. One fewer tap is a thin reason to switch where your family gets its money.

## What survived the review

- **There is a real problem.** Enrich’s 2023 survey included 112 Filipino migrant domestic workers. Over half of Filipino respondents reported borrowing from family or friends for recruitment-related costs. That supports investigating upfront costs. It also means family help belongs in the comparison. [Enrich survey](https://enrichhk.org/press-release-survey-finds-nearly-30-migrant-domestic-workers-pay-1-3-months-salary-get-their-first)
- **There may be a narrow timing gap.** Budget Finance offers a loan for first-time overseas workers but lists a visa, travel ticket, and overseas employment certificate before release. A legitimate bill might be due before those documents arrive. We need a real bill, a deadline, and what the worker could actually get by then. [Budget Finance](https://budgetfinance.ph/ofw-loan) · [Existing alternatives](solstice-alternatives-comparison.md)
- **The training bill is a weak anchor for a real product.** Fair Employment Agency already includes a first-timer’s TESDA assessment in its package. Check who owes the bill and whether it is already covered before testing a worker loan. Keep the contest invoice fictional. [Fair Employment Agency](https://fairagency.org/helper-full-hire/)
- **Linking repayment to remittances already exists.** DFCC offers that model in other corridors. Solstice’s split and shared record give the contest demo something concrete to show. A partner still needs to tell us which decision the shared record improves over an ordinary receipt. [DFCC](https://www.dfcc.lk/digital-banking/personal-digital-banking/ethera-saviya)

## Three paths worth comparing

| Path | What makes it worth testing | What rules it out |
| --- | --- | --- |
| **Standalone worker app** | A real worker-owned bill falls through available alternatives and a funder can pay it by the deadline on acceptable terms. The worker chooses the new route at the same family payout after seeing all costs. | The same bill and payout are achievable with tools the worker already has, or no funder can improve the terms. **Pause now.** |
| **Feature inside an existing lender or remitter** | A partner names a repayment or reconciliation problem, can show how often it happens, and commits a person and date to test the flow. Use its existing distribution and payout. | An ordinary receipt solves the problem, the partner has no reason to change terms or operations, or the worker gets a worse deal. **Test this if the bill really belongs to the worker, or an existing lender brings a distinct repayment problem.** |
| **Get the responsible payer to pay the provider sooner** | The bill should be covered but timing leaves the worker fronting it. An employer, provider, or organization handling payment can show a repeated delay and agree to try a direct payment process. Start on paper or with an ordinary invoice and receipt. | Existing coverage already handles it on time, or the real issue is refusal, coercion, or disputes that a payment tool cannot resolve. **Test this first if the worker should never have had to borrow.** [Issara precedent in another corridor](https://www.issarainstitute.org/ethical-recruitment) |

## Two checks before more product work

**1. Replay a real bill before showing Solstice.** Ask an advisor or caseworker the team already knows for a recent anonymized case. “What was the bill? Who was supposed to pay, and who paid? When was it due? What did the person try? What did each option cost, and which could actually pay on time?” Include family help, existing credit, employer coverage, and a deadline extension. Ask for a case that resolved fine too. Record the difference. An advisor’s recollection helps find cases and still leaves worker demand open.

**2. Test only the option the case points to.** If someone you know already sends money home, ask what they did the last time they had to send money and pay a bill around the same payday. Show two unlabeled choices in alternating order. One uses their current service and a separate loan payment. The other uses one combined payment. Hold the amount credited to the loan and the pesos reaching family constant. Include the real fees, delivery time, payout method and any extra account steps when known. Ask “What would you do next payday?” and allow “keep what I do now.” Ask which single change would alter the answer. A remittance sender outside the target group can test the payment choice as a proxy. Keep that separate from evidence about Filipino domestic workers in Hong Kong. Skip cold outreach.

**Check a partner problem in parallel.** An existing lender could already make the loans and still struggle to match incoming payments to the right balances. If a partner can name that problem, ask them to replay up to five anonymized payments with their current process and the existing demo receipt. Before replaying, agree on the result worth pursuing, such as less manual work or fewer mismatches. Include exceptions. Use the simpler existing process if it does the job. Five records are enough for a cheap workflow check.

**Decision gate.** Use one week of discovery after the submission, with a case owner and partner owner. Drop a lending case if an available option pays the same bill on time at equal or lower cost on acceptable terms. One case with a materially better outcome or a measurable partner workflow improvement earns a small follow-up if someone owns it and sets a date. Without that evidence by the check-in, shelve new feature work and record what was unavailable. Reopen when a new case or partner offer changes the comparison.

For a credit pilot, compare the same amount arriving at the provider by the same date and the same pesos arriving to family. Count all fees and the consequences of missed or off-platform payments. Require explicit approval of final terms before funding. In the current demo, the lender sets the fee at funding and the original share sets the minimum. A loan opened at 15% has no room to lower the percentage. A smaller transfer pays less toward the loan. [Contract](../../contracts/laya/src/lib.rs)

## What to do for the submission

- **Build owner:** verify the real Testnet remittance first. Use the pre-funded loan cut if setup is blocked. Save the Stellar transaction and signed-out Solstice receipt. If repayment itself fails, flag the live Devpost requirement and move the separate Showcase form forward.
- **Pitch owner:** label the invoice and loan terms as illustrative on screen. Show the provider payment and one remittance that pays family and reduces the balance. Describe earlier funding, better terms and worker adoption as open questions. Use the feedback check only if someone is available. A screen comprehension test and a choice test answer different questions.
- **Team:** treat this as a recommendation. Keep the submission moving while deciding whether to spend a week on discovery.

[Production checklist](solstice-devpost-production.md) · [Current research](solstice-research-decision.md) · [Devpost deadline](https://blockchain-stellar-ic.devpost.com/details/dates)
