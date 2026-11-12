# Solstice advisor meeting

November 9, 2026 · Bring this and the [alternatives comparison](solstice-alternatives-comparison.md).

## Open with this

“Say Maria has a bill she really owes before her first paycheck. In our demo, a lender pays the bill directly. Later, Maria sends money home and pays down the loan in one step. We want your help figuring out whether that step makes the loan better for Maria and what we can honestly claim in the pitch.”

## Put two choices in front of the advisor

Start with a fictional bill Maria genuinely owes. Assume it gets paid on time in both cases. Use test money and ignore fees for this first comparison.

| | What Maria does | Family gets | Loan goes down |
| --- | --- | --- | --- |
| **Normal loan and money transfer** | Sends 340 home and pays the lender 60 separately. | 340 | 60 |
| **Solstice** | Sends 400 once. The app sends 340 home and 60 to the lender. | 340 | 60 |

Ask what would make her choose the second offer. If the answer is a better loan, ask what a lender would need to see before offering it. If the answer is convenience, ask whether it survives extra sign-up steps, fees, or a different way for family to get their money.

## Ask these in order

Start with “If you were judging this, what would you challenge first?” Give the advisor room to answer before explaining more.

1. **What’s the most believable bill for this demo?** Can you name a cost the worker actually owes that might come due before a normal loan pays out? If we keep a fictional bill, what wording avoids implying every worker owes it?
2. **What changes for the lender?** Maria can send money through another service or skip a month. Would the split change when you’d lend, how much you’d charge, or how you’d handle a missed payment? What evidence would you need? Ask for the best objection first.
3. **Would you care about the Stellar record?** The lender can check both payments and the debt update on the same record. When would a normal receipt fail to do the job? What should a judge see in the one-minute demo?

## Leave with one decision

- **If the advisor gives a credible reason the split could improve loan terms**, keep that as the idea you’re testing. Write down the reason and the evidence needed.
- **If the main benefit is one fewer payment step**, pitch that as the demonstrated benefit. Keep earlier funding and lower prices out of the claims.
- **If the bill example falls apart**, show a clearly fictional worker-paid invoice and use the time to prove the split.

Close with “Would you lead with sorting the bills or splitting the repayment? Which claim would you cut?” Ask someone on the team to record the answer, what it’s based on, and who will verify the next step. Treat the conversation as expert feedback. Worker demand and lender participation still need direct evidence.

## What the team can test today

Have a teammate who hasn’t seen the demo explain who got the 340, who got the 60, and what happened to the debt. The local checkout has provider, lender and receipt screens. Check teammate branches or a deployed preview for the worker screens before promising a full run. Once the whole flow is available, have a teammate check the actual Testnet payment and balance. If there’s time, try a payment from a wallet with too little test money and confirm that both recipient balances and the debt stay the same. Use the successful run for the video.

[Challenge brief](../context/challenge-brief.md) · [Research verdict](solstice-research-decision.md) · [Existing failure test](../../contracts/laya/src/test.rs)

**Pre-meeting check:** The simulated run passed, including the 340/60 split and the debt going from 195.70 to 135.70. The read-only check of the live test network returned an error before it could verify the contract. Use the paper example or label the simulation clearly if you show it today.
