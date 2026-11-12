# Solstice Devpost: what to do next

**Historical Testnet payment verified.** Loan #13 paid 190 test USDC to the provider, then split 400 into **340 to family and 60 to the lender**, leaving **135.70 owed**. Use the one-minute script for a fresh signed run or a labeled mock walkthrough with the historical proof. [Verified remittance](https://stellar.expert/explorer/testnet/tx/0e07bb9956d1e4fb301fc841b1838216da8b958b31fc071ec88423395daf22bf)

- **Building?** Follow the checklist below.
- **Recording?** Use the [one-minute script](solstice-video-script.md).
- **Filling Devpost?** Use the [entry draft](solstice-devpost-draft.md).
- **Doing the one-pager?** Use the [separate Showcase plan](../context/showcase-form-plan.md). Keep it moving while the video is blocked.

Aim to submit **Thursday, November 12 by 6 p.m. EST**. Devpost closes **Friday, November 13 at 8:30 a.m. EST**. [Event requirements](https://blockchain-stellar-ic.devpost.com/) · [Schedule](https://blockchain-stellar-ic.devpost.com/details/dates)

## Who does what

- [ ] **Build owner · Prove it works.** Use the intended deployed build with mock mode off and synthetic invoices. Use the funded Testnet wallets assigned to each role. In Freighter, use separate browser profiles or switch accounts and reconnect. Check the family address and 15% share. Capture the funding and remittance links and open the public receipt signed out.
- [ ] **Repo owner · Verify the README.** Include prerequisites, setup, start commands, Testnet configuration, and how a judge can check the 400-unit example. Mark steps that require team wallets. Have someone follow the instructions from a fresh checkout.
- [ ] **Video owner · Rehearse and record.** Time the script aloud. For a fresh run, capture the request, funding, split and proof from the same loan. If signing is unavailable, label the current app footage and historical proof separately. Cut wallet waits and keep the numbers readable.
- [ ] **Submitter · Check access now.** Open the event draft and confirm team access, required fields and who can make the repo public. When the links are ready, open the app, Solstice receipt, Stellar transaction, video and public repo signed out. Check video playback from Devpost and scan public assets for credentials or personal data. Submit, confirm Devpost says **Submitted**, and save the confirmation.

## If the demo breaks

1. **Bill sorting breaks?** Fix and rerun the intake flow. If it remains blocked, show the working training path and describe only the steps visible in the recording.
2. **Fresh Testnet signing unavailable?** Prepare the labeled walkthrough and historical proof described in the script as contingency footage. Organizer acceptance of that cut is unconfirmed. The Devpost entry still requires a functional Testnet deployment.

## What’s verified so far

Read-only checks passed against the deployed Testnet contract on November 12, 2026. Historical loan #13 matches the intended payment and remittance amounts. Request #14 confirms the separate 65 test USDC employer grant. A fresh signed run of this branch requires the team’s configured Testnet wallets. [App walkthrough and evidence](../../app/README.md)

From `app/`, run `npm run smoke:mock` for the simulation or `npm run smoke:real -- --reads` to check the configured contract without sending a transaction. The full `npm run smoke:real` sends transactions. Use the authorized disposable Testnet setup.

**Save one handoff with the run.** Include the build commit, app URL, Testnet contract ID, asset and issuer, loan ID, funding and remittance transaction links, Solstice receipt URL, repo URL, and video URL when ready. Keep the recorded loan and app configuration stable through judging. The receipt reads the current balance, so a second payment changes what judges see. Keep the Stellar transaction link separate.

## User feedback, if someone is available

Skip cold outreach to Filipino domestic workers in Hong Kong. If someone the team knows already sends money home, start there. Otherwise label it a usability check. Give them the worker screen and ask them to use 400 total, with 15% going toward the loan. Before they confirm, ask what family gets, what the lender gets, and what they’ll still owe.

Write down where they got stuck. Fix one thing if the session warrants it, then retest with a fresh participant or a different amount so they have to read the screen again. Save who tested, what happened, what changed, and the retest result. Keep advisor input separate. If nobody has tested, mark it pending.

## Rerun the agent review when something changes

Say “Read `agents/README.md` and rerun the Devpost review. Use the new evidence, update the drafts, and give me one handoff.”

1. Check what changed in the build, recording, links or tester notes. Review the entry and script independently against that evidence.
2. Fix mismatched amounts, weak claims, confusing wording or missing steps. Check again until the drafts pass or an outside blocker remains. Treat lower costs, earlier funding and lender participation as open questions.
3. Give the team one update with what passed, what changed, and who needs to do what next. Ask only for access, evidence or a team decision the agent needs. Leave publishing and submission with the authorized submitter.
