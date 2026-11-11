# Solstice one-minute Devpost video

**Recording draft.** The amounts below are the planned demo inputs and expected outputs. Use this narration once the recorded Testnet run passes the checks. The local `origin/main` snapshot at `c460c3c` contains the worker request, dashboard, family and receipt pages. Confirm the exact deployment before recording.

**What the viewer should remember.** A lender pays Maria’s training provider directly. When Maria sends money home through Solstice, Stellar delivers the family payment and loan repayment in one transaction.

## Record this cut

Use one fictional worker, one training invoice, and one funded loan throughout. Start on the working app. Keep **Stellar Testnet · fictional invoice and illustrative loan terms** visible and use the same loan ID across cuts. The time ranges are edit points.

| Time | Voiceover | Screen and action |
| --- | --- | --- |
| 0:00–0:08 | “Maria is a fictional Filipino domestic worker headed to Hong Kong. Her training bill is due before payday.” | Open the actual worker request page. Zoom in on the 190-unit training bill and provider. Put the Solstice name on this shot. |
| 0:08–0:20 | “In Solstice, Maria attaches the training invoice and chooses to put fifteen percent of each remittance toward repayment.” | On **List your bills**, remove the default medical and placement-fee rows before capture. Show the synthetic invoice, 190 amount and 15% share. Submit via **Sign and send 1 request** and hold the resulting request. |
| 0:20–0:34 | “The school confirms the invoice. The lender pays the school 190 directly. With a three percent flat fee, Maria owes 195.70.” | Show **Confirm invoice**, then **Flat fee (%)** set to 3 and **Fund loan**. Keep the provider and loan ID legible. Caption the observed result **190 paid to school · 5.70 fee · 195.70 owed**. |
| 0:34–0:51 | “Maria sends 400 through Solstice. At her chosen fifteen percent share, her family gets 340, the lender gets 60, and her balance drops to 135.70.” | Enter 400 in **Send money home** on the worker dashboard. Hold the preview for the two recipients, click **Send 400 home** and cut wallet waiting. Hold the confirmed result with both amounts and the updated balance. |
| 0:51–1:00 | “Both payments settle in one Stellar transaction. The public receipt shows the updated loan balance.” | Show the actual remittance transaction in the Testnet explorer, then the public receipt for the same loan. Leave the receipt on screen with **135.70 owed** readable. |

**Optional 0:08–0:20 triage cut.** If the same build verifies the outcomes and the edit still makes the training request clear, say “The app’s demo rules assign the exam to the employer, refuse the placement fee, and route training to financing.” Show the three classifications and the training request. Complete any accepted rows with synthetic inputs before submitting. Keep the 15% share visible in the app. Any medical payment claim needs its own observed transaction. Keep the training-only cut if triage competes with the repayment and proof shots.

**Pacing.** The primary voiceover is about 115 spoken words with the amounts read aloud. The opening is the tightest beat at 18 words in eight seconds. Read the full table once against a stopwatch before capture. If the opening runs long, use “Maria’s training bill is due before her first paycheck in Hong Kong.” Caption **Fictional worker · Philippines to Hong Kong**. Hold the split and proof shots through the full allotted time.

## Before you hit record

Follow the [production checklist](solstice-devpost-production.md) for wallets, Testnet proof and upload. Start with a fresh loan and check its ID before sending. If the team records the build that still shows the old name, add a small **Solstice · earlier build shown as Laya** caption. Keep the old legal wording and cost comparison out of the shot, and leave the actual payment outcome visible.

For the playback check, give someone one watch. Ask who received the training payment, where the 400 went, and where to check it. If they miss a point, fix the caption or hold the shot longer.

If setup footage is blocked, open on the verified funded loan with **Already funded on Testnet**. Keep the opening line about Maria. Then say “The lender has already paid her training provider. With the three percent flat fee, Maria owes 195.70.” Move straight to the remittance and give the extra time to the split and proof.

[Devpost plan](../context/devpost-submission-plan.md) · [Organizer requirements in the challenge brief](../context/challenge-brief.md) · [Planned scenario](../context/pitch-context.md)
