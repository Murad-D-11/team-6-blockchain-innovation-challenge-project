# Solstice pitch context

See the [challenge brief](challenge-brief.md) for the organizer’s rubric, required demo video, submission instructions, and deadlines.

Compiled November 8, 2026 from the three Laya PDFs and the [working pitch and one-page overview](../../docs/luke-pitch-draft.md). The source documents use the older name Laya. The demo below is planned. Confirm live readiness, team commitments, and organizer requirements before relying on them.

## Story and challenge fit

**Problem.** Maria is a fictional Filipina domestic worker preparing to work in Hong Kong. Charges arrive before her first paycheck, when borrowing for the full amount could leave her repaying costs the employer should cover or a charge she should dispute.

**Insight.** Check who owes each bill before offering credit. Our hypothesis is that this step reduces the amount a worker needs to borrow.

**Solution.** Maria enters bill details and selects sample invoices. Solstice applies demo rules, routes the medical exam to the employer, offers financing for a hypothetical worker-payable training charge, and refuses a placement fee charged to Maria by a Philippine recruiter. Providers confirm submitted amounts against their records and receive payments directly. Maria chooses a share of future remittances through Solstice to repay the loan.

V1.1 depended on existing lenders accepting a reduced payoff. V2 intervenes before the worker takes on debt. Keep the training loan and repayment prominent: the November 4 brief frames the entry around “loans that fit real income.” Confirm the track and current judging criteria from organizer materials.

## What judges should see

| Beat | Planned result |
| --- | --- |
| Classify three bills | Show the **1,380 test USDC placement fee from a Philippine recruiter** being refused. The app applies the illustrative rulebook. Unclear cases go to review in the proposed workflow. |
| Confirm and pay accepted bills | The provider signs to confirm the submitted amount. The employer pays **65 test USDC** directly to the clinic, leaving Maria owing zero for the exam. A mission funder pays **190 test USDC** directly to the training provider for the hypothetical expense. At a **3% flat fee**, Maria owes **195.70**. |
| Send money home | A **400 test USDC** remittance at Maria’s chosen **15%** share sends **60** to the funder and **340** to family in one Stellar transaction. The loan balance becomes **135.70**. |
| Open the public receipt | Show the payment record and invoice fingerprint. The browser fingerprints the file locally. The receipt can match the bytes of a copy supplied separately. |

**Why Stellar.** The demo uses a single transaction for the remittance split and gives judges a shared payment record they can inspect. Bill classification and refusal happen in the app.

**Rehearsal.** Historical Testnet loan #13 verifies the provider payment and exact 400 / 340 / 60 split with 135.70 outstanding. Request #14 verifies the separate clinic payment. The app handles placement-fee refusal locally. A fresh recording needs configured Testnet signers. See the script for a labeled mock walkthrough with historical Testnet proof as a fallback. [Demo script and transactions](../artifacts/solstice-video-script.md)

## Claims and judge questions

- **Demo facts.** Maria, the invoices, and participants are fictional. Amounts are test USDC. The training invoice is **190**. The walkthrough also uses 190 as the training ceiling, while the task plan lists 250 as an illustrative ceiling. Use the invoice amount in the pitch and leave the ceiling out.
- **What is verified about the bills?** Hong Kong's standard contract puts the pre-employment exam expense on the employer. The demo proposes paying the clinic directly. Philippine rules exempt domestic workers from a Philippine recruiter's placement fee. A TESDA certification expense can be worker-payable in specific circumstances. The paid training example and its 190-unit amount remain hypothetical. [Bill evidence](../artifacts/solstice-demo-bill-evidence.md)
- **How does invoice intake work?** The worker enters the bill details. The app computes a fingerprint from the selected file locally. The provider signs the submitted request and can compare its amount with their own records. A pilot could use structured invoice fields and provider confirmation, with PDF text extraction or OCR to prefill fields and review for ambiguous cases.
- **Evidence to check before quoting.** Start with the Hong Kong Labour Department’s foreign domestic helper guide for employer-paid expenses and the Employment Agencies Administration’s guidance for Hong Kong agency charges. Check Philippine-side placement-fee rules separately. The task plan cites PCIJ reporting on the 2022 Migrasia survey of 961 workers. Verify the original wording, sample, and applicability before using the reported 80.5% debt figure.
- **Employer refuses to pay?** The bill remains unpaid. Employer participation before departure is a validation question.
- **Who has to participate?** The worker consents to financing and the remittance split. The provider checks and confirms the bill. The employer must participate in direct payment, the lender must agree to fund the bill on the stated terms, and a remittance partner must support the payment and repayment flow. These are proposed roles. Confirm real commitments before naming partners.
- **What if Maria remits elsewhere?** The split applies to remittances sent through Solstice. Adoption, off-platform repayment, and production licensing remain open.

## Pitch deliverables and dates to confirm

The Nov 5–18 task plan calls for a three-minute pitch, one-pager draft by Nov 11, one-pager submission Nov 13 at 8:30 a.m., backup recording by Nov 13, two full rehearsals Nov 13–15, showcase Nov 16, and final deck upload Nov 18 at 10 a.m. Confirm current owners, submission details, and deadlines with the team and organizer. Use the [challenge brief](challenge-brief.md) for the organizer requirements and the [Top 16 submission plan](top-16-submission-plan.md) for the first-round checklist.

## Source map

- [Working pitch and one-page overview](../../docs/luke-pitch-draft.md) for current draft wording.
- **Laya Brief.pdf** for Maria’s walkthrough, demo amounts, and repayment edge cases.
- **Laya v2 Problem and Solution Brief.pdf**, Nov 4, for the pivot rationale, adoption assumptions, and evidence leads.
- **Laya v2 team task plan (Nov 5 to Nov 18).pdf**, pp. 20–27, for pitch deliverables, demo sequence, advisor questions, and claim checks.

The PDFs were supplied separately. This page records the pitch-relevant details by source filename.
