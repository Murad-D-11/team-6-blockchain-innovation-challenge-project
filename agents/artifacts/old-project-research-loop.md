# Solstice old-project research loop

November 9, 2026 · Decision brief for the pitch team. Scope is the Laya V2 inbox proposal, with the V1.1 payoff model as a separate comparison. [Inbox review](old-docs-review.md)

## Decision

Pitch Solstice as a way to get pre-departure bills to the right payer before a worker borrows. An existing agency or worker-support channel is a more plausible starting point than asking workers to find and trust a standalone app. Keep direct lending as the comparison and refer to it when it already provides an equivalent or better outcome. The Testnet financing flow illustrates what a participating lender could do.

Independent advice matters when the agency steers the financing. A 2021 Winrock/Migrasia survey of 961 current and former overseas Filipino workers reported that 24% faced agency pressure or a requirement to use a specific money provider. The sample spans destinations and occupations, so use it as evidence that steering occurs and keep its frequency in the target corridor open. [Original study](https://winrock.org/wp-content/uploads/2022/02/Asia-CTIP-Evaluating-Information-Arbitrage-and-Financial-Exploitation-by-Migration-Intermediaries.pdf)

## What the research settled

| Question | Finding | Evidence needed to go further |
| --- | --- | --- |
| Why use it over a direct loan? | The worker benefits if someone else pays a bill she would otherwise have had to front, or if a legitimate expense gets funded sooner or on better all-in terms. Fair Employment Agency already covers a standard medical exam and a first-timer TESDA assessment in its employer-paid package. Budget Finance lends to first-time workers but asks for the OEC, visa and ticket before release. These are real alternatives and one possible timing gap. [Fair Employment Agency](https://fairagency.org/helper-full-hire/) · [Budget Finance](https://budgetfinance.ph/ofw-loan) | A dated bill, when it was due, and what the worker could access on that date. |
| Is the demo training bill eligible? | Philippine DMW rules distinguish a competency certificate from additional assessment required by the employer. They also exempt domestic workers from placement fees. The demo's generic training label does not establish who owes the invoice. Hong Kong guidance describes reimbursement of specified expenses including medical exams. [DMW rules, §§55–59](https://dmw.gov.ph/archives/v1/resources/dsms/DMW/ISN-EXT/2023/DMW-DC-01-2023.pdf) · [HK Labour Department guide](https://www.fdh.labour.gov.hk/res/pdf/FDHguideEnglish.pdf) | Identify the actual invoice and check the corridor-specific contract and agency coverage before assigning a payer. |
| Who would introduce it? | An agency can already resolve some bills itself. A worker-support organization could help test the workflow, but Enrich explicitly separates its free debt support from promoting financial products. [Enrich](https://enrichhk.org/debt-free-helper) | A caseworker or agency willing to run a real case before payment is due and identify which step the workflow improves. |
| Who funds and pays for it? | No confirmed funder. At 190 advanced and 195.70 due, 5.70 is the maximum gross lender revenue before funding costs, servicing and losses. With 2 in costs and a binary full-repayment-or-zero model, break-even is about 98.1% full repayment. These are illustrative inputs. Solstice's operating costs are separate. [Research log](research-log.md#example-break-even-math) | A written example quote with release date, required documents, total repayment and who covers servicing. |
| Why Stellar? | One transaction can split a remittance and give participants an independently inspectable record. Conventional platforms also support splits. The relevant advantage depends on who needs shared proof and how the real route compares on total cost and family payout. [Stellar transaction lookup](https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getTransaction) · [Stripe transfers](https://docs.stripe.com/connect/separate-charges-and-transfers) · [Wise corridor example](https://wise.com/hk/send-money/send-money-to-philippines) | A repeatable Testnet run with transaction links, plus a prospective partner's reason to need independent verification. |
| Does V1.1 solve a stronger problem? | A worker with costly existing debt has a clear reason to accept cheaper replacement financing. The old creditor has to accept the discounted payoff. Signing records agreement once given. Creditor willingness and the legal effect of settlement depend on the actual case. [V1.1 spec](../../docs/SPEC.md) | A creditor willing to confirm full discharge at a concrete payoff and a replacement funder willing to advance it. |

## Solstice versus the alternatives

See the [Solstice Alternatives Comparison](solstice-alternatives-comparison.md) for the one-page pitch reference.

## Verdict after checking comparable products

**Contest prototype: continue. Standalone product: hold.** The underlying costs are documented. What remains unproven is whether this exact flow gives a worker better financing or an easier way to pay it back without making it harder for family to receive money.

- **Closest local comparison:** PrimeCredit offers sending money abroad and paying back loans in the same app. Its materials describe separate functions. Solstice's specific proposal is to do both in one payment and update the debt at the same time. [primepay](https://www.primecredit.com/osw/primepay/) · [Payment methods](https://www.primecredit.com/osw/payment-method/)
- **Closest lending precedent:** DFCC in Sri Lanka offers pre-departure loans repaid through money sent home to a DFCC account. This shows a lender can build a loan around that payment channel. It leaves Solstice's voluntary percentage split, pricing and eligibility untested. [DFCC Ethera Saviya](https://www.dfcc.lk/digital-banking/personal-digital-banking/ethera-saviya)
- **Best technical proof:** Have someone outside the team inspect both transfers and the debt update from one Testnet transaction. Then force one transfer to fail and check that neither transfer nor the debt update goes through. The check covers the Stellar transaction. Confirming that family receives pesos is a separate step. [Contract](../../contracts/laya/src/lib.rs)

Advance the product only when a lender quotes better terms against a real bill timeline and the worker prefers the combined flow at the same family payout. A lender could offer earlier funding, lower total cost, or flexible payments the worker values. Ask what happens if she skips a month, sends through another service, or needs her whole transfer to reach family.

## Next research round

For the remittance comparison, AlipayHK already advertises blockchain-backed remittances with GCash delivery on this corridor. Compare same-day routes using the same PHP amount delivered to family, total HKD paid, amount credited to the loan, and what happens if payment fails. The flat 3% demo fee alone does not establish an annual borrowing cost because repayment timing varies. [AlipayHK](https://www.alipayhk.com/en/remittance/) · [BSP loan cost guidance](https://www.bsp.gov.ph/Pages/Forms/DispForm.aspx?ID=1895)

The research owner should ask a worker or caseworker to reconstruct one recent, de-identified hire from bill demand through payment. Capture the bill, amount, payer, deadline, documents available that day, actual payment, and best timely alternative. Then ask a lender for a quote against that same timeline. One case can establish that the proposed sequence is possible. Use several contrasting cases, including an agency that already covers the bill, before making broader adoption claims.

- **Continue financing** if a real worker-paid bill is due before a comparable option can fund it and a partner can pay the provider in time at acceptable all-in terms.
- **Focus on bill resolution** if the meaningful improvement is an employer payment or a successful referral to existing help.
- **Narrow the pitch claim** if existing options already solve the cases observed. Keep demo amounts and participants explicitly fictional.

The desk research used parallel checks on payer rules, direct alternatives, and financing and settlement. Stop searching a question once the remaining uncertainty depends on someone doing something in a specific case. Use records and retrospective interviews to map the current workflow, then observe an assisted trial. [GOV.UK discovery research guidance](https://www.gov.uk/service-manual/user-research/user-research-in-discovery)
