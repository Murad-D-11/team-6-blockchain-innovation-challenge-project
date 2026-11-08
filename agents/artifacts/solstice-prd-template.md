# Solstice working PRD

Draft for product discussion. The prompts are for the team to answer in its own words. Example decisions remain proposed until the team agrees. Use role descriptions for ownership.

The goal is to agree on what the product should do and what the prototype can prove, so the one-pager and Devpost tell the same defensible story. The [challenge brief](../context/challenge-brief.md) holds organizer requirements. The [Top 16 submission plan](../context/top-16-submission-plan.md) holds deadlines, packaging and submission checks.

## 1. User and current problem

- Who are we serving first? What happens between receiving a bill and the first paycheck?
- How does the worker currently cover the cost? Where does that process fail?
- What is sourced evidence? What is an assumption about Maria's fictional scenario?
- What would a successful outcome look like for the worker? How could we measure it in a pilot?

## 2. Proposed flow and incentives

Start here. Follow a single hypothetical training bill from invoice to repayment before writing the summary.

| Step | Who acts and what do they do? | Why would they do it? | What happens if they decline or the step fails? |
| --- | --- | --- | --- |
| Worker receives bill and requests financing | | | |
| Provider confirms invoice | | | |
| Funder discloses terms and pays provider | | | |
| Worker remits and repayment is split | | | |
| Parties inspect payment evidence | | | |

Explain when the worker sees the total cost, what the current prototype authorizes, and what happens if the worker remits elsewhere. Then explain where the employer-paid bill and placement-fee refusal fit.

## 3. Product decisions and tradeoffs

For each consequential decision, capture **choice, alternative, rationale, supporting evidence, what would change our mind, and decision status**. Use proposed or agreed. Record only choices that affect the workflow, the MVP or a public claim.

Start with direct payment to the provider, repayment through Solstice remittances, and what Stellar contributes compared with ordinary payment rails. Explain which parts belong in the app and which require the contract.

## 4. MVP scope and acceptance checks

For each proposed must-have, capture **user-visible behavior, priority, acceptance check, proof status, and evidence link**. Keep the list small and state what gets cut first.

Example acceptance check: a single Testnet remittance makes both expected transfers and updates the loan balance. Record the tested deployment, date and transaction when verified. Track proof separately from agreement on scope. See [pitch context](../context/pitch-context.md) for the current demo assumptions.

## 5. Open risks and next tests

For each consequential unknown, write **assumption, consequence if wrong, smallest useful test, and how the result would change the decision**.

Start with whether a lender would fund the invoice and whether the worker would use this remittance path. Keep real user feedback, advisor input, and internal Testnet evidence distinct.

## 6. Rubric review

For each published criterion, link the product decisions that matter, record the evidence available today, and identify the largest gap. Use this as a review of the PRD and a guide to what the submission should communicate. The exact Top 16 screening method is unconfirmed. [Challenge brief](../context/challenge-brief.md)

### Business Impact and Relevance (37.5%)

Check problem evidence, first customer segment, differentiation, sustainability, and user validation.

### Technology and Implementation (37.5%)

Check meaningful Stellar use, a verifiable end-to-end build, architecture, security and trust, and accessibility.

### Presentation & Deliverables (25%)

Check that a cold reviewer can explain the worker's problem, who pays, how repayment works, and what the demo proves. Use the submission plan for deliverable requirements.

## How to work through this draft

Explain the flow in your own words. Ask the AI to challenge one assumption at a time. Record decisions once you can defend them, then define what the demo needs to show. Review the result against the rubric before extracting the one-pager and Devpost copy.

References for the structure: [Atlassian PRD template](https://www.atlassian.com/software/confluence/templates/product-requirements), [Storj PRD template](https://github.com/storj/roadmap/blob/main/Product%20Requirements%20Document%20Template), and [store.new proof-of-concept PRD](https://github.com/yournextstore/new.store/blob/main/docs/new-store-prd.md).
