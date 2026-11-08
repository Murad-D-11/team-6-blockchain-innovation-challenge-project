# Solstice Top 16 submission plan

Prepared November 8, 2026. All times are Waterloo time (EST).

## Submit two things by Friday, November 13 at 8:30 a.m.

| Submission | What must be ready | How to verify |
| --- | --- | --- |
| [Project Showcase form][showcase] | The one-page solution overview, adapted to the actual form fields. Velocity explicitly identifies this form as the route to consideration for the Top 16. | Open the form now, capture its required fields, limits and upload instructions, then save the submission confirmation. The field list could not be verified from the public form. |
| [Challenge Devpost][event] | A project entry with a publicly accessible one-minute video of a functioning prototype, a complete public GitHub repo with setup/run instructions, and a working Stellar Testnet prototype with contract ID(s) and/or a live app URL. Provide both app URL and contract ID if available. | Submit to the event, verify the event entry says **Submitted**, and save the confirmation. Test the actual submission links from a signed-out browser. |

**Deadline correction.** The Notion export gives the Airtable deadline but omits the Devpost cutoff. The live event listing and schedule give **Nov 13, 8:30 a.m. EST** for Devpost too. Complete both before then. The organizer materials establish the form’s screening role. How selectors use Devpost during screening and whether there is a separate screening rubric remain unconfirmed. [Organizer deliverables][deliverables] · [Event listing][event] · [Event schedule][event-dates] · [Devpost submission help][submit]

The trifold and three-minute booth pitch are for the selected Top 16 on Nov 16. The one-minute video is required in that pitch and belongs in the first-round Devpost package. Prepare the display and booth rehearsal after the submissions are secured. [Organizer schedule][schedule]

## Agree on the idea before writing

Use one sentence across both entries: **Solstice helps Filipino domestic workers heading to Hong Kong sort pre-departure bills before borrowing, pay providers directly, and repay eligible financing through a chosen share of remittances sent through the app.**

The worker is the initial user. The employer and prospective lender are different payers. The employer covers its assigned bill, the lender advances the eligible training cost directly to the provider, and the worker repays the lender. An agency or worker-support group is a distribution hypothesis. A licensed lender or remittance provider is a possible production partner. Identify who would bear operating and compliance costs, and test whether they have a reason to participate. The example financing fee belongs to the lender economics in the demo. Treat Solstice’s sustainability model as open. [Organizer problem space][track] · [Working pitch][pitch]

Use two complementary examples to explain the wedge. The refusal shows why bill triage matters. The funded training bill and remittance show why this fits the track’s focus on loans for irregular income. The alternative to compare against is paying fees up front and seeking reimbursement later, a workflow described in Hong Kong’s employer guidance. Explain how the proposed flow changes when and to whom money moves. Avoid claims about how widespread the problem is unless the source supports the number and population. [HK Labour Department employer guide][hk] · [Organizer problem space][track]

Answer the track’s practical questions in the Devpost story or supporting README. Show who sends and receives the demo assets and the total demo cost of 195.70 on the 190-unit loan. Identify real-world FX, cash-in and cash-out costs as open. Explain what happens after a missed remittance using the behavior verified in the demo. Keep custody, collections and dispute handling as production questions. One sustainability hypothesis to test is whether a lender would cover servicing or integration costs in exchange for a documented provider payment and repayment flow. [Organizer problem space][track]

## MVP that earns the claims

Source code and a planned demo are starting points. Treat deployment and each outcome as unverified until a teammate records the run against the submission build. Use synthetic invoices and test assets throughout.

**First build check.** In the Nov 8 checkout (`141276b`), the provider, funder, and proof pages exist, but the worker request, worker dashboard, and family pages are absent. Check teammate branches and the deployed app before assigning new work. Confirm the integrated worker flow as the first technical blocker. The checkout also lacks a root project README, and the app README is a starter template. Testnet configuration exists, but the configured contract ID and asset label alone establish neither live functionality nor the issuer’s identity. Run the read-only smoke check from `app/` with `npm run smoke:real -- --reads`, then run the full browser flow with mock mode disabled. Capture per-transaction explorer links separately from the contract link. [App source](../../app/src/app/) · [Smoke script](../../app/scripts/smoke.ts) · [Deployment config](../../app/src/config/testnet.json) · [Stellar Testnet deployment guide][stellar]

| Priority | Acceptance check | Evidence to keep |
| --- | --- | --- |
| P0 · Bill triage | A worker can see how the demo rulebook treats all three example bills. The app refuses the 1,380 test-unit placement fee without initiating funding. An unclear case displays its actual handling. | Screenshot of the three outcomes. Explain that the app applies the rules, with demo classifications and price assumptions. |
| P0 · Training loan | A provider confirms the training invoice and the funder pays 190 directly to the provider. The worker sees a 3% flat fee, 5.70 fee amount and 195.70 total owed in the demo asset. | Testnet transaction, receipt, and balance or state before and after. Verify actual asset and issuer before naming it. |
| P0 · Repayment | A 400-unit remittance at 15% pays 60 to the funder and 340 to family in one Testnet transaction. The outstanding balance goes from 195.70 to 135.70. | Transaction hash and both transfer amounts, matched to the same app version and contract. Explain that the split applies to remittances made through Solstice. |
| P0 · Judge verification | A second teammate can open the public deployment and inspect an example receipt without team credentials. A judge can find the exact Testnet contract and see transaction evidence. | App link, read-only starting URL, contract ID, transaction link(s), and a tested README. Verify where a wallet is actually needed. |
| P1 · Employer grant | The employer pays 65 directly to the medical provider and the worker owes zero for that invoice. | Testnet transaction and zero-debt result. Keep this as a short visual if time is tight. If it fails, describe the behavior as planned. |
| P1 · Trust and resilience | Check wrong-role actions, an unsuccessful funding attempt, and the repayment boundary or pause behavior against actual implementation. Confirm only intended demo data is public. | Record actual checks and outcomes. Publish no wallet secrets, production credentials, or real invoice data. |

One continuous training-to-repayment run is more valuable than five disconnected screens. Keep multi-country rules, a production review queue, and additional dashboards outside the submission critical path. For the README, provide prerequisites, setup and run steps, Testnet configuration, sample inputs and an expected result. Have a second teammate follow it. Record a stable deployment, commit, contract ID and representative transactions so the video, site and repo tell the same story. [Organizer rubric][rubric] · [Stellar developer documentation][stellar]

## Make the one-pager readable on its own

The pitch owner drafts this first while the build owners verify the MVP. Use [the existing one-page draft][pitch] and map it to the real Airtable fields. Give a reviewer who has never seen the project one minute to read it and ask them to explain the user, why the problem happens before payday, what the product changes, and what the prototype actually proves.

1. **Problem and user.** Start with one specific corridor and the upfront cash gap. Introduce Maria as fictional. One candidate fact: the ILO and Philippine Statistics Authority’s analysis of 2019 survey data estimated recruitment costs at about **1.8 months of earnings** for domestic-services workers on the Philippines–Hong Kong corridor. Give the year and population. [ILO/PSA report, executive summary][ilo]
2. **Solution.** Walk through the three bills in one short paragraph. Explain who pays and when. Spend more space on the loan than on listing features.
3. **Stellar and proof.** Explain the single remittance transaction, separate destinations and inspectable payment record. Include the deployment or demo link if the form permits it.
4. **Impact and feasibility.** Give one or two proposed measures, such as upfront amount financed by the worker or the share of bills resolved before departure. State what remains to validate and how you would test it.

## Build the Devpost page for a quick first read

Open the event-specific draft today and inspect its fields. Put the **working video, live Testnet app, read-only receipt, public repo and contract ID** near the top or in the relevant dedicated fields. Use the same project name and claim wording in both submissions. Devpost supports a tagline, Markdown story, technology tags, try-it links and a gallery. Use a clear thumbnail and two or three screenshots with captions identifying the actual outcomes. [Devpost submission fields][fields]

Use a short story with these headings: **Who it serves**, **How it works**, **Why Stellar**, **What we built and how to verify it**, **What we learned**, and **Limits and next test**. State which actions run on Soroban and which are app logic. Show the payment and invoice fingerprint separately. A matching fingerprint shows the same file bytes, while provider confirmation is a separate assertion. Describe the prototype as Testnet only and use the actual asset name and issuer where relevant.

**Suggested 60-second edit**

| Time | Show |
| --- | --- |
| 0–8s | Maria’s situation and the three bills on screen. |
| 8–20s | Refusal and who pays the other two bills. |
| 20–34s | Provider confirmation and the funded training bill with total owed. |
| 34–51s | Submit or show the confirmed remittance and its 60/340 split and remaining balance. |
| 51–60s | Open the public receipt and show the transaction evidence. |

Record a working run, cut waiting and wallet switching, use readable captions, and label pre-staged states if used. Upload early to public YouTube with embedding enabled and test the actual event entry playback. The event permits publicly hosted links such as YouTube or Loom, while Devpost’s help identifies YouTube and Vimeo for embedding. Verify the event video field even if the portfolio video is already set. [Event video requirement][event] · [Devpost video guidance][video] · [Event versus portfolio video][edit]

## Use the real rubric as the review checklist

The event publishes these categories for judging. Use them as a quality target for both submissions. The Top 16 screen’s own scoring method has not been confirmed. [Organizer rubric][rubric]

| Criterion | What Solstice should give the judge |
| --- | --- |
| **Business Impact and Relevance · 37.5%** | A specific user and first market, credible evidence that the problem matters, a clear contrast with reimbursement after payment, an impact measure, and a realistic account of lender/employer incentives and sustainability. Show actual feedback and one resulting change if available. |
| **Technology and Implementation · 37.5%** | The verifiable Testnet run, its atomic split and balance update, public repo and contract, clear app/chain boundary, testable flows and privacy controls. Explain how a future licensed partner could fit, as a hypothesis. |
| **Presentation & Deliverables · 25%** | One clear story, a functioning prototype in the one-minute video, easy-to-find links and complete submissions. At the Showcase, the organizer breaks this category into 15% delivery and 10% display quality. |

The FAQ allows a nonprofit and says a revenue model is not required in the finals pitch. The rubric still rewards sustainability. Explain who would pay for delivery and why. The strongest validation would be real user feedback. At Nov 9 advisor office hours, ask who could distribute the product, whether employers would pay providers upfront and whether a lender would accept this repayment design. Log the source and any resulting change. Distinguish advisor feedback, teammate usability checks, and actual user testing. [Organizer FAQ][faq] · [Organizer rubric][rubric]

## Schedule and final red-team gate

Owners below are proposed from the team plan. Confirm them at the next check-in. [Team plan][team]

| Internal target | Owner and exit check |
| --- | --- |
| **Nov 8** | The pitch owner opens both forms and records actual fields. The integration and contract owners identify the Testnet build, asset, contract, and current blockers. The worker-flow owner verifies the worker flow. Pick one accountable submitter and a backup. |
| **Nov 9** | The pitch owner drafts the one-pager and Devpost in parallel with the build. The advisor-session attendee records advisor feedback and tags any unverified pitch claims. Build owners prioritize the training-to-repayment path and public receipt. |
| **Nov 10** | Build owners run the flow end to end, record the deployed commit and transactions, and hand the pitch owner a repeatable recording run. Escalate any P0 failure that day and narrow unsupported claims. |
| **Nov 11** | The pitch owner edits and uploads the video and completes the entries. A teammate reviews the one-pager. A teammate outside the recording run verifies all links and attempts the judge path. |
| **Nov 12 by 6 p.m.** | Submit both when complete. Verify Airtable confirmation and Devpost **Submitted** state, and save the receipts and submitted copy. Use Friday morning as a buffer before the 8:30 a.m. cutoff. |

Before submitting, have someone read both entries as a skeptical judge:

- **Can I reproduce the central claim?** Match the app, video and ledger evidence. Remove unsupported claims of live functionality if the run fails. A mock can help explain an idea but cannot satisfy the Testnet requirement.
- **Is this a testnet proof or a promise about the real world?** Keep partner participation and impact claims tied to evidence. Hong Kong employer guidance covers specified contract expenses, including medical examination fees. The Philippine DMW rules exclude domestic workers from placement fees. Treat the training bill as a hypothetical eligible cost. The current contract authorizes the worker request, and the funder sets the fee later. Describe explicit approval of the final total before funding and contract enforcement of payer policy as production design work. [Hong Kong Labour Department][hk] · [Philippine DMW rules, §§55–59][dmw] · [Contract source](../../contracts/laya/src/lib.rs)
- **Can I see the benefit in a minute?** Ask a cold reviewer to identify who pays the training provider, how the worker repays and why Stellar matters. Revise the opening or labels if they miss a beat.
- **Can I access everything?** Check video and public repo signed out, open the read-only proof link, verify the exact contract and asset, and review the repo and screenshots for credentials and personal data before making them public.
- **Did both actually submit?** Reopen the saved confirmation and event entry. Confirm form fields, file formats and team membership against the actual event interfaces.

If Devpost or the build is blocked, submit the complete Airtable entry independently and contact Velocity promptly about the Devpost blocker. Work against the published deadline. Describe any missing prototype behavior accurately in the one-pager.

[event]: https://blockchain-stellar-ic.devpost.com/
[event-dates]: https://blockchain-stellar-ic.devpost.com/details/dates
[showcase]: https://airtable.com/apprwC5wqwb4We3jo/pageD4iVuMUuoOvFs/form
[submit]: https://help.devpost.com/article/122-how-to-enter-a-submission
[fields]: https://help.devpost.com/article/126-know-your-submission-steps
[video]: https://help.devpost.com/article/84-video-making-best-practices
[edit]: https://help.devpost.com/article/123-how-to-edit-a-submission
[stellar]: https://developers.stellar.org/docs/build/smart-contracts/getting-started/deploy-to-testnet
[hk]: https://www.fdh.labour.gov.hk/res/pdf/Handy_Guide_for_Employers_of_FDHs_English_version_Web_version.pdf
[dmw]: https://dmw.gov.ph/archives/v1/resources/dsms/DMW/ISN-EXT/2023/DMW-DC-01-2023.pdf
[ilo]: https://www.ilo.org/sites/default/files/2024-05/measuring-sustainable-development-goal-indicator-philippines-report-2023-en.pdf
[pitch]: ../../docs/luke-pitch-draft.md
[team]: ../../docs/PLAN-v2.md
[schedule]: <../inbox/notion page/Blockchain Innovation Challenge powered by Stellar 2245d5ce61158391aacd811206c87353.md>
[deliverables]: <../inbox/notion page/Challenge deliverables and important deadlines 6925d5ce61158308a9dc8102c1d62950.md>
[rubric]: <../inbox/notion page/Judges, Criteria & Prizes 3c35d5ce6115837dad2a8165dd925ece.md>
[faq]: <../inbox/notion page/FAQ 0d45d5ce611583da989e015f14b8ead4.md>
[track]: <../inbox/notion page/Access to Fair Financial Assets and Affordable Fin dc75d5ce61158307b6fe01057585f919.md>
