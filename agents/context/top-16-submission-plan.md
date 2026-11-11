# Solstice Top 16 submission plan

Prepared November 8, 2026. All times are Waterloo time (EST).

## Submit two things by Friday, November 13 at 8:30 a.m.

| Submission | What must be ready | How to verify |
| --- | --- | --- |
| [Project Showcase form][showcase] | The one-page solution overview, adapted to the actual form fields. Velocity explicitly identifies this form as the route to consideration for the Top 16. | Open the form now, capture its required fields, limits and upload instructions, then save the submission confirmation. The field list could not be verified from the public form. |
| [Challenge Devpost][event] | A project entry with a publicly accessible one-minute video of a functioning prototype, a complete public GitHub repo with setup/run instructions, and a working Stellar Testnet prototype with contract ID(s) and/or a live app URL. Provide both app URL and contract ID if available. | Submit to the event, verify the event entry says **Submitted**, and save the confirmation. Test the actual submission links from a signed-out browser. |

**Deadline correction.** The Notion export gives the Airtable deadline but omits the Devpost cutoff. The live event listing and schedule give **Nov 13, 8:30 a.m. EST** for Devpost too. Complete both before then. The organizer materials establish the form’s screening role. How selectors use Devpost during screening and whether there is a separate screening rubric remain unconfirmed. [Organizer deliverables][deliverables] · [Event listing][event] · [Event schedule][event-dates] · [Devpost submission help][submit]

The trifold and three-minute booth pitch are for the selected Top 16 on Nov 16. The one-minute video is required in that pitch and belongs in the first-round Devpost package. Prepare the display and booth rehearsal after the submissions are secured. [Organizer schedule][schedule]

## Submission plans

- [Devpost submission plan](devpost-submission-plan.md)
- [Project Showcase form plan](showcase-form-plan.md)

## Agent workflow

1. **Load and compare.** Read the challenge brief, core flow, pitch context and the two submission plans. Check current source, existing drafts and accessible event fields. Treat dated checkout findings as historical. Record the source and verification date for each requirement that affects submission.
2. **Prepare both packages independently.** Draft the one-pager and Devpost copy from the same verified facts. For Devpost, prepare the shot list and run the Testnet checks when available. Match the recording, deployed build, asset, contract ID and transaction evidence. Save working copy and check results under agents/artifacts. Update an existing draft when possible.
3. **Apply the standing validation constraint.** Skip cold outreach to Filipino domestic workers in Hong Kong. If the team has a willing remittance sender in its network, use their feedback and describe their relationship to the target audience accurately. Otherwise use a cold usability walkthrough with a non-team participant. Ask them to predict the family amount, lender amount and remaining balance on the 400-unit remittance at 15%. Capture the observed confusion, the actual fix and the retest result. Keep advisor feedback separate. If nobody has tested, leave validation pending and state the gap.
4. **Verify and revise autonomously.** Check required fields, deadline, word limits, consistency, factual support and signed-out access. Remove or qualify unsupported optional claims and retry recoverable checks without asking for routine feedback. Keep booth and finals preparation out of the initial submission gate.
5. **Hand off once.** For each package give the exact draft and links, status (ready, blocked or submitted), evidence and remaining action. Ask only about blockers that require team access, a participant, a shared-scope decision or authorization to publish or submit. Bundle those asks. Continue preparing the other package if one is blocked. When authorized to submit, verify the event entry or form receipt and save the submitted copy.
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
| **Nov 11** | The pitch owner edits and uploads the video and completes the entries. Run the shared verification checks and flag any check that needs a teammate. |
| **Nov 12 by 6 p.m.** | Submit both when complete. Verify Airtable confirmation and Devpost **Submitted** state, and save the receipts and submitted copy. Use Friday morning as a buffer before the 8:30 a.m. cutoff. |

Before submitting, run these checks across both entries. Use an outside reader for the cold-read check when one is available.

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
[hk]: https://www.fdh.labour.gov.hk/res/pdf/Handy_Guide_for_Employers_of_FDHs_English_version_Web_version.pdf
[dmw]: https://dmw.gov.ph/archives/v1/resources/dsms/DMW/ISN-EXT/2023/DMW-DC-01-2023.pdf
[team]: ../../docs/PLAN-v2.md
[schedule]: <../inbox/notion page/Blockchain Innovation Challenge powered by Stellar 2245d5ce61158391aacd811206c87353.md>
[deliverables]: <../inbox/notion page/Challenge deliverables and important deadlines 6925d5ce61158308a9dc8102c1d62950.md>
[rubric]: <../inbox/notion page/Judges, Criteria & Prizes 3c35d5ce6115837dad2a8165dd925ece.md>
[faq]: <../inbox/notion page/FAQ 0d45d5ce611583da989e015f14b8ead4.md>
