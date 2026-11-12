# Solstice working PRD

This is our working explanation of what Solstice should do and what the demo needs to prove. The choices below are proposals for the team to discuss. Use the [challenge brief](../context/challenge-brief.md) for organizer rules and the [submission plan](../context/top-16-submission-plan.md) for deadlines and what to submit.

## 1. Why does Maria need money before payday?

Maria is a fictional Filipino domestic worker preparing to work in Hong Kong. She gets bills before her first paycheck. If she can’t cover a bill in time, she may have to borrow. A cheaper loan only helps if she knows about it, can qualify, and gets the money before the bill is due.

**What we know.** An ILO and Philippine Statistics Authority study using 2019 survey data estimated recruitment costs at about 1.8 months of earnings for domestic-services workers on this route. ICIJ documented cases where recruiters directed workers to expensive lenders. We still need to learn how workers in Maria’s situation cover bills today and what cheaper options they can actually use. [ILO/PSA report](https://www.ilo.org/sites/default/files/2024-05/measuring-sustainable-development-goal-indicator-philippines-report-2023-en.pdf) · [ICIJ investigation](https://www.icij.org/investigations/trafficking-inc/philippine-lenders-and-labor-agents-fleece-workers-seeking-overseas-jobs-interviews-and-confidential-documents-show/)

**What would improve for Maria?** She could avoid borrowing for a bill someone else should pay and get a clear price for any loan she needs. In a small real-world trial, we could measure how much money workers have to pay from their own pockets before departure. The demo shows how payments could work. A trial would tell us whether workers are better off.

## 2. Who pays whom, and why would they agree?

Start with one hypothetical training bill. The numbers are demo amounts on Stellar’s test network, where the app uses test funds.

1. **Maria asks for help with a bill of 190.** The school confirms the amount. Getting paid directly could give the school a reason to confirm. If the school skips confirmation, the contract should block funding.
2. **A lender pays the school 190.** A 3% one-time fee adds 5.70, so Maria owes 195.70. The lender would receive that 5.70 if she repays in full, before the cost of approving and running the loan or covering losses. A lender that already serves these workers is a candidate. We still need to find one that would make this loan on these terms. If nobody funds it, the bill stays unpaid.
3. **Maria sends 400 home through Solstice.** A transfer home is called a *remittance*. At the 15% share in the example, 60 goes to the lender and 340 goes to her family. She still owes 135.70. The 3% fee sets the extra cost of the loan. The 15% share sets how much of each transfer goes toward paying it back. If Maria sends money through another service, that transfer leaves her Solstice balance unchanged.
4. **Someone checks the payment.** The demo should let a judge open a public receipt and check the transaction on Stellar. The receipt can help confirm that a payment happened. The school’s confirmation is a separate step.

**When does Maria agree to the price?** The code lets Maria sign the request and the lender choose the fee later. There’s no separate signature from Maria accepting the final fee. We need to decide whether she must see and accept the full cost before the school gets paid, and whether to build that into the demo or explain it as a gap. [Contract code](../../contracts/laya/src/lib.rs)

**Where do the other bills fit?** The demo assigns the medical exam to the employer and refuses to finance the placement fee. Hong Kong’s standard contract makes employers responsible for specified expenses, including medical exam fees. Philippine rules exempt domestic workers from placement fees charged by licensed recruitment agencies. The training bill is a fictional example of a cost Maria could be eligible to borrow for. Employer willingness to pay in advance through Solstice still needs checking. [Hong Kong Immigration FAQ, Q14](https://www.immd.gov.hk/eng/faq/foreign-domestic-helpers.html) · [Philippine DMW rules, §56](https://dmw.gov.ph/archives/v1/resources/dsms/DMW/ISN-EXT/2023/DMW-DC-01-2023.pdf)

## 3. Why would Maria use Solstice? What does Stellar do?

If Maria can go straight to a cheaper lender and get the bill paid in time, she has a good reason to do that. Solstice could help if it reaches her before she borrows, helps sort out who should pay each bill, and gives her a way to get the right bill covered. A worker-support group is one possible way to reach her. We still need to find out how she would hear about us and who would actually put up the money.

| Choice to discuss | Other option | Why try it? What would change our minds? |
| --- | --- | --- |
| Pay the school directly | Give Maria the money to pay the school | Direct payment ties the loan to a bill the school confirmed. Revisit it if schools can’t accept the payment or the extra steps make it harder for Maria to pay in time. |
| Repay a share when Maria sends money home | Make a separate loan payment or pay a fixed amount on a schedule | It could fit better with when Maria has money available. Revisit it if she prefers her usual transfer service or if the lender needs a different repayment arrangement. |
| Spend most of the video on the training loan | Give all three bills equal time | A full loan example shows where the money starts and where it goes. Include more of the other two if the team verifies them and viewers can still follow the loan. |

**What Stellar does.** The app uses the demo rules to sort the bills. Code running on Stellar, called a *smart contract*, handles the provider payment and can split money between the lender and family in one transaction while updating what Maria owes. Stellar also gives people a payment record they can check. A regular payment service could do parts of this. The question to answer for judges is who benefits from checking the same record independently and why. [App rules](../../app/src/lib/rulebook.ts) · [Contract code](../../contracts/laya/src/lib.rs)

## 4. What does our demo have to show?

The training loan and repayment are proposed must-haves. The other two bills support the story. A behavior counts as working once someone runs it on the version we’ll submit and records the result.

| What we want to show | How we check it | Where we stand |
| --- | --- | --- |
| The training bill gets paid | Maria requests financing, the school confirms, and the lender pays the school 190 test units. Check the 5.70 fee and 195.70 owed. Try funding before confirmation and check that no money moves. | Payment logic is in the code. The full run still needs proof. |
| Maria sends money home and repays part of the same loan | Send 400. Check that 60 goes to the lender, 340 goes to family, and 135.70 remains owed. Have another teammate open the public receipt without team credentials and check the transaction. | The full run still needs proof. |
| The other bills get different outcomes | Check that the app refuses the placement-fee request without starting funding. Separately, confirm the employer can pay the clinic and Maria owes zero for that bill. | Show these as working only after checking them. Cut the employer transaction from the video first if it crowds out the loan. |

**Last build check, Nov 8.** The version we checked, `f873a05`, had pages for the school, lender, and receipt. It was missing the worker request, worker dashboard, and family pages. Our check couldn’t connect to Stellar’s test network from that environment. Get the version that combines everyone’s work, then save the tested version, date, and payment links for the run. [Smoke test](../../app/scripts/smoke.ts)

## 5. What could make this idea fall apart?

| Open question | Why it matters | How we can learn |
| --- | --- | --- |
| Who would lend 190, and why? | The school stays unpaid if no lender takes the risk. | Ask a lender what it costs to approve and run a loan this small, what would make them say yes, and what they would do if Maria misses payments. Revisit the loan design if the terms don’t work. |
| How does Maria hear about us before the bill is due? | The recruiter’s lender may be the only option she encounters in time. | Ask a worker or caseworker to walk through a recent bill. Find out who presented it, when it was due, and what options were available. Use the answer to decide where Solstice would need to reach her. |
| Why would Maria send money home through Solstice? | Paying through another service leaves this loan balance unchanged. | Ask how she chooses a service today. Compare convenience and total cost. Revisit whether to link loan repayment to transfers through Solstice. |
| When should Maria see and accept the total cost? | She needs to know what she’ll owe before agreeing to the loan. | Walk through what she sees and signs today. Decide what the demo must show and which gap to explain to judges. |

Record who gave the feedback and what it changed. A worker describing a real bill, an advisor offering an opinion, and a teammate running the demo each answer a different question.

## 6. What can we show judges for each criterion?

These are the published criteria. The exact Top 16 screening method is still unconfirmed. [Challenge brief](../context/challenge-brief.md)

### Business Impact and Relevance (37.5%)

We have research on recruitment costs and a specific worker in mind. We need to explain why Maria would use Solstice over her available options, who would lend to her, and who would pay to keep the service running. Look for actual feedback and say what it changed.

### Technology and Implementation (37.5%)

Show one training bill from request through repayment. Let a judge check the receipt and payment. Explain what the app decides and what Stellar handles. The biggest gap is a verified run on the submission build.

### Presentation & Deliverables (25%)

A viewer should be able to say who paid the school, how Maria pays the lender back, and what the demo proved. Use the [submission plan](../context/top-16-submission-plan.md) to match the actual form fields to the claims and their supporting evidence.

## How to work through this draft

Close the document and explain one bill aloud. Then change one thing. What happens if the lender says no? If Maria uses another transfer service? If she already has a cheaper loan offer? When an answer gets fuzzy, write down the specific question. Decide what we want the product to do, check what the build does, and use both answers when writing the pitch.

Start with **who puts up the 190 and how Maria finds them before the bill is due**. Record the team’s answer in its own words before treating it as agreed.
