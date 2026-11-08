# Solstice working PRD

Draft for product discussion. The prompts are for the team to answer in its own words. Example decisions remain proposed until the team agrees. Use role descriptions for ownership.

The goal is to agree on what the product should do and what the prototype can prove, so the one-pager and Devpost tell the same defensible story. The [challenge brief](../context/challenge-brief.md) holds organizer requirements. The [Top 16 submission plan](../context/top-16-submission-plan.md) holds deadlines, packaging and submission checks.

## 1. User and current problem

- Who are we serving first? What happens between receiving a bill and the first paycheck?
- How does the worker currently cover the cost? Where does that process fail?
- What is sourced evidence? What is an assumption about Maria's fictional scenario?
- What would a successful outcome look like for the worker? How could we measure it in a pilot?

**Working answer.** Start with Filipino domestic workers preparing for employment in Hong Kong. Maria is a fictional example of a worker who receives bills before her first paycheck. An ILO and Philippine Statistics Authority analysis of 2019 survey data estimated recruitment costs on this corridor at about 1.8 months of earnings for domestic-services workers. That historical figure supports the significance of upfront costs. How a worker in Maria’s situation currently raises money and which part of that process Solstice can improve are open discovery questions. A candidate pilot measure is the amount a worker has to advance out of pocket before departure. [Evidence and source links](../context/top-16-submission-plan.md)

## 2. Proposed flow and incentives

Start here. Follow a single hypothetical training bill from invoice to repayment before writing the summary.

| Step | Who acts and what do they do? | Why would they do it? | What happens if they decline or the step fails? |
| --- | --- | --- | --- |
| Worker receives bill and requests financing | Maria submits a hypothetical eligible training invoice and selects a repayment share. | Potentially avoid paying the full bill up front. | No request proceeds without worker authorization. |
| Provider confirms invoice | Training provider confirms the request. | Direct payment is a plausible incentive. Validate it. | Without confirmation, the funding path should stop. |
| Funder discloses terms and pays provider | Proposed product flow separates disclosure and worker acceptance from direct payment. The existing contract lets the funder set the fee after the worker signs the request. | **Open.** Decide who advances the money and what would make this loan worth funding. | No advance means the invoice stays unpaid. How the worker sees and accepts the final terms is open. |
| Worker remits and repayment is split | Proposed demo sends 400 test units at a 15% repayment share, with 60 to the funder and 340 to family. | The worker can repay while sending money home. Willingness to use this channel is open. | A remittance through another service triggers no Solstice repayment. Decide how the product should handle that. |
| Parties inspect payment evidence | A judge or participant opens a read-only receipt and checks the payment against Testnet evidence. | Independently inspect the demo payment. | If public evidence cannot be opened, the verification check fails. |

Explain when the worker sees the total cost, what the current prototype authorizes, and what happens if the worker remits elsewhere. Then explain where the employer-paid bill and placement-fee refusal fit.

**Proposed role of the other two bills.** Use them to explain why triage comes before borrowing. Show the refusal briefly if verified. Include the employer payment as working only once tested. Both should be checked separately before claiming the full three-bill flow.

**Rulebook evidence.** Hong Kong’s standard employment contract assigns specified expenses, including medical exam fees, to the employer. This supports the example’s payer assignment. Willingness to pay up front through Solstice is an adoption question. Philippine DMW rules exempt domestic workers from placement fees charged by licensed recruitment agencies. The training invoice remains a hypothetical eligible bill. [Hong Kong Immigration FAQ, Q14](https://www.immd.gov.hk/eng/faq/foreign-domestic-helpers.html) · [Philippine DMW rules, §56](https://dmw.gov.ph/archives/v1/resources/dsms/DMW/ISN-EXT/2023/DMW-DC-01-2023.pdf)

## 3. Product decisions and tradeoffs

For each consequential decision, capture **choice, alternative, rationale, supporting evidence, what would change our mind, and decision status**. Use proposed or agreed. Record only choices that affect the workflow, the MVP or a public claim.

Start with direct payment to the provider, repayment through Solstice remittances, and what Stellar contributes compared with ordinary payment rails. Explain which parts belong in the app and which require the contract.

| Proposed choice | Alternative | Rationale and evidence | What would change the choice? | Status |
| --- | --- | --- | --- | --- |
| Pay the provider directly | Pay the worker and have them settle the invoice | Tie financing to a confirmed bill. The [contract](../../contracts/laya/src/lib.rs) implements provider payment. Provider willingness and operational feasibility are open. | A provider workflow test shows direct settlement is impractical or creates a worse outcome for workers. | Proposed |
| Repay through Solstice remittances | Fixed installment or separate repayment | A single contract call can split the transfer and update the loan. Bill classification stays in the app. Compare this with what a payment provider could do and whether an independently checkable record matters to the parties. | Workers prefer their existing remittance channel or funders need a different repayment arrangement. | Proposed |
| Make the financed training bill the core demo | Give all three bills equal time | One complete loan path connects the worker’s upfront bill to repayment and verifiable payment evidence. The other bills explain why triage matters. [Submission plan](../context/top-16-submission-plan.md) | A verified broader flow fits the one-minute video and makes the product easier to understand. | Proposed |

## 4. MVP scope and acceptance checks

For each proposed must-have, capture **user-visible behavior, priority, acceptance check, proof status, and evidence link**. Keep the list small and state what gets cut first.

**Build evidence, Nov 8.** Checkout `f873a05` has provider, funder, and proof pages. The worker request, worker dashboard, and family pages are absent in this checkout. No integrated browser run was located. The read-only Testnet smoke attempt stopped on the first config read with a generic wallet/network error. Live behavior remains unverified. Get the integrated branch or deployment and record a clean run before claiming the flow works. [Smoke script](../../app/scripts/smoke.ts)

| User-visible behavior | Priority | Acceptance check | Proof status and evidence |
| --- | --- | --- | --- |
| Request, confirm, and fund one eligible training invoice | Proposed must-have | On the deployed build, the worker submits a request, the provider confirms it, and the funder pays the provider 190 test units. Confirm the 3% example fee and the 195.70 balance. Attempt funding before confirmation and check that it fails without moving funds. | Code evidence only. Record deployment, date and transaction links. [Contract](../../contracts/laya/src/lib.rs) |
| Split a remittance and inspect proof | Proposed must-have | The same loan shows 60 to funder, 340 to family, and 135.70 remaining after a 400-unit remittance. A second person opens the receipt without team credentials and checks the transaction. | End-to-end run unverified. [Pitch context](../context/pitch-context.md) |
| Explain the other two bills | Conditional video beats | If shown working, verify the app refusal without funding and the employer payment leaving zero owed for that bill. | Unverified. Cut the employer transaction from the video first if it crowds out the loan proof. |

## 5. Open risks and next tests

For each consequential unknown, write **assumption, consequence if wrong, smallest useful test, and how the result would change the decision**.

Start with whether a lender would fund the invoice and whether the worker would use this remittance path. Keep real user feedback, advisor input, and internal Testnet evidence distinct.

| Assumption | If wrong | Smallest useful test | Decision it informs |
| --- | --- | --- | --- |
| A funder will advance the eligible cost | The loan path has no payer | Ask a prospective funder or advisor what approval, costs, and safeguards would be needed. Record their role and exact evidence. | Whether to retain the payer hypothesis or narrow the claim. |
| The worker would use this remittance channel | Expected repayments may not occur | Ask a worker or appropriate proxy to walk through their current remittance choices and compare costs and convenience. Label proxy evidence. | Whether repayment through Solstice is a viable requirement. |
| The worker can understand and accept the total before funding | The proposed consent story may exceed actual behavior | Walk through the signing sequence and compare it with the contract authorization. | Whether explicit fee acceptance is MVP scope or a disclosed production gap. |

## 6. Rubric review

For each published criterion, link the product decisions that matter, record the evidence available today, and identify the largest gap. Use this as a review of the PRD and a guide to what the submission should communicate. The exact Top 16 screening method is unconfirmed. [Challenge brief](../context/challenge-brief.md)

### Business Impact and Relevance (37.5%)

Check problem evidence, first customer segment, differentiation, sustainability, and user validation.

**Evidence and gap.** Corridor research supports the problem framing. Direct provider payment and flexible repayment are proposed responses. The largest gap is evidence that the payer and worker would participate, including who would cover operating costs.

### Technology and Implementation (37.5%)

Check meaningful Stellar use, a verifiable end-to-end build, architecture, security and trust, and accessibility.

**Evidence and gap.** The contract contains the transfer and repayment logic. The largest gap is a verified deployed run from request to public proof, including where the app rulebook ends and contract checks begin.

### Presentation & Deliverables (25%)

Check that a cold reviewer can explain the worker's problem, who pays, how repayment works, and what the demo proves. Use the submission plan for deliverable requirements.

**Evidence and gap.** The planned story and numbers are in the pitch context. Confirm the actual Airtable fields and map each material claim to evidence or an explicit qualifier in the submission draft.

## How to work through this draft

Explain the flow in your own words. Ask the AI to challenge one assumption at a time. Record decisions once you can defend them, then define what the demo needs to show. Review the result against the rubric before extracting the one-pager and Devpost copy.

References for the structure: [Atlassian PRD template](https://www.atlassian.com/software/confluence/templates/product-requirements), [Storj PRD template](https://github.com/storj/roadmap/blob/main/Product%20Requirements%20Document%20Template), and [store.new proof-of-concept PRD](https://github.com/yournextstore/new.store/blob/main/docs/new-store-prd.md).
