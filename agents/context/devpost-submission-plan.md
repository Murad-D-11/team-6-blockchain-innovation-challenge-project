# Devpost submission plan

For current working copy, recording steps and verification results, see the [Devpost production runbook](../artifacts/solstice-devpost-production.md).

Due November 13, 2026 at 8:30 a.m. EST. Follow the [shared submission workflow](top-16-submission-plan.md).

Submit a public one-minute working-prototype video, public GitHub repo with setup and run instructions, and functional Stellar Testnet prototype with a deployed contract ID or live app URL.

## Agree on the idea before writing

Use the [pitch foundations](solstice-pitch-foundations.md) across both entries and [pitch evidence](solstice-pitch-evidence.md) for sourced claims.

The worker is the initial user. The employer and prospective lender are different payers. The employer covers its assigned bill, the lender advances the eligible training cost directly to the provider, and the worker repays the lender. An agency or worker-support group is a distribution hypothesis. A licensed lender or remittance provider is a possible production partner. Identify who would bear operating and compliance costs, and test whether they have a reason to participate. The example financing fee belongs to the lender economics in the demo. Treat Solstice’s sustainability model as open.

Show the employer-paid exam first so a viewer can see which bill the worker avoids borrowing for. Briefly show the placement-fee refusal, then use the hypothetical training bill and remittance split to explain the financing and repayment. The alternative to compare against is paying fees up front and seeking reimbursement later, a workflow described in Hong Kong’s employer guidance. Explain how the proposed flow changes when and to whom money moves. Avoid claims about how widespread the problem is unless the source supports the number and population. [HK Labour Department employer guide][hk]

Use the [challenge brief](challenge-brief.md#problem-space-and-fit) to answer the track’s practical questions in the Devpost story or supporting README. Show who sends and receives the demo assets and the total demo cost of 195.70 on the 190-unit loan. Identify real-world FX, cash-in and cash-out costs as open. Explain what happens after a missed remittance using the behavior verified in the demo. Keep custody, collections and dispute handling as production questions. One sustainability hypothesis to test is whether a lender would cover servicing or integration costs in exchange for a documented provider payment and repayment flow.

## MVP that earns the claims

Source code and a planned demo are starting points. Treat deployment and each outcome as unverified until a teammate records the run against the submission build. Use synthetic invoices and test assets throughout.

**Submission build check.** The current checkout has worker request, worker dashboard, family, provider, funder, and proof pages plus [root setup instructions](../../README.md). The [production runbook](../artifacts/solstice-devpost-production.md) documents historical Testnet evidence. Verify the intended deployment and asset, run the read-only smoke check from `app/` with `npm run smoke:real -- --reads`, and capture a fresh signed browser run if available. Save the transaction links and test the public proof page signed out.

| Priority | Acceptance check | Evidence to keep |
| --- | --- | --- |
| P0 · Bill triage | A worker can see how the demo rulebook treats all three example bills. The app refuses the 1,380 test-unit placement fee without initiating funding. An unclear case displays its actual handling. | Screenshot of the three outcomes. Explain that the app applies the rules, with demo classifications and price assumptions. |
| P0 · Training loan | A provider confirms the training invoice and the funder pays 190 directly to the provider. The worker sees a 3% flat fee, 5.70 fee amount and 195.70 total owed in the demo asset. | Testnet transaction, receipt, and balance or state before and after. Verify actual asset and issuer before naming it. |
| P0 · Repayment | A 400-unit remittance at 15% pays 60 to the funder and 340 to family in one Testnet transaction. The outstanding balance goes from 195.70 to 135.70. | Transaction hash and both transfer amounts, matched to the same app version and contract. Explain that the split applies to remittances made through Solstice. |
| P0 · Judge verification | A second teammate can open the public deployment and inspect an example receipt without team credentials. A judge can find the exact Testnet contract and see transaction evidence. | App link, read-only starting URL, contract ID, transaction link(s), and a tested README. Verify where a wallet is actually needed. |
| P1 · Employer grant | The employer pays 65 directly to the medical provider and the worker owes zero for that invoice. | Testnet transaction and zero-debt result. Show the employer as payer in the opening. Show the paid result only with a matching transaction. If it fails, describe the behavior as planned. |
| P1 · Trust and resilience | Check wrong-role actions, an unsuccessful funding attempt, and the repayment boundary or pause behavior against actual implementation. Confirm only intended demo data is public. | Record actual checks and outcomes. Publish no wallet secrets, production credentials, or real invoice data. |

One continuous training-to-repayment run is more valuable than five disconnected screens. Keep multi-country rules, a production review queue, and additional dashboards outside the submission critical path. For the README, provide prerequisites, setup and run steps, Testnet configuration, sample inputs and an expected result. Have a second teammate follow it. Record a stable deployment, commit, contract ID and representative transactions so the video, site and repo tell the same story. [Organizer rubric][rubric] · [Stellar developer documentation][stellar]

## Build the Devpost page for a quick first read

Open the event-specific draft today and inspect its fields. Put the **working video, live Testnet app, read-only receipt, public repo and contract ID** near the top or in the relevant dedicated fields. Use the same project name and claim wording in both submissions. Devpost supports a tagline, Markdown story, technology tags, try-it links and a gallery. Use a clear thumbnail and two or three screenshots with captions identifying the actual outcomes. [Devpost submission fields][fields]

Use a short story with these headings: **Who it serves**, **How it works**, **Why Stellar**, **What we built and how to verify it**, **What we learned**, and **Limits and next test**. State which actions run on Soroban and which are app logic. Show the payment and invoice fingerprint separately. A matching fingerprint shows the same file bytes, while provider confirmation is a separate assertion. Describe the prototype as Testnet only and use the actual asset name and issuer where relevant.

Use the [one-minute video script](../artifacts/solstice-video-script.md) for shot timing and the [production runbook](../artifacts/solstice-devpost-production.md) for capture and upload checks. A labeled mock cut with historical proof is contingency footage. Organizer acceptance of that cut is unconfirmed.

Record a working run, cut waiting and wallet switching, use readable captions, and label pre-staged states if used. Upload early to public YouTube with embedding enabled and test the actual event entry playback. The event permits publicly hosted links such as YouTube or Loom, while Devpost’s help identifies YouTube and Vimeo for embedding. Verify the event video field even if the portfolio video is already set. [Event video requirement][event] · [Devpost video guidance][video] · [Event versus portfolio video][edit]

[event]: https://blockchain-stellar-ic.devpost.com/
[fields]: https://help.devpost.com/article/126-know-your-submission-steps
[video]: https://help.devpost.com/article/84-video-making-best-practices
[edit]: https://help.devpost.com/article/123-how-to-edit-a-submission
[stellar]: https://developers.stellar.org/docs/build/smart-contracts/getting-started/deploy-to-testnet
[hk]: https://www.fdh.labour.gov.hk/res/pdf/Handy_Guide_for_Employers_of_FDHs_English_version_Web_version.pdf
[rubric]: https://uwvelocity.notion.site/Judges-Criteria-Prizes-55163713ead68280bca8010b823ef072
