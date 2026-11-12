# Solstice one-minute Devpost video

Open on the app. Give viewers the problem and Solstice’s job in the first shot, then show the payer decision, provider payment, and remittance. Keep one training loan from request through receipt. The clinic payment is a separate request. The script follows Devpost’s narrated screencast guidance and Kevin Hale’s advice to explain what you do in plain language. [Devpost video guidance](https://help.devpost.com/article/84-video-making-best-practices) · [Kevin Hale’s YC talk](https://www.ycombinator.com/library/6q-how-to-pitch-your-startup) · [Challenge requirements](https://blockchain-stellar-ic.devpost.com/)

| Time | Voiceover | Screen and action |
| --- | --- | --- |
| 0:00–0:10 | “Maria is moving from the Philippines to Hong Kong for work. Her bills come before her first paycheck. Solstice checks who should pay before she borrows.” | Start on the worker’s bill screen. Show the medical exam immediately. Caption **Fictional worker · Philippines to Hong Kong**. |
| 0:10–0:22 | “Her employer owes the clinic bill. Solstice also blocks the recruiter’s placement fee, so Maria only asks to borrow for this sample training bill.” | Cut through the actual bill outcomes. Hold briefly on **Employer pays** and the refused Philippine recruiter fee. Land on the 190 training request. |
| 0:22–0:34 | “The school confirms the bill. The lender pays the school directly. With the fee, Maria owes 195.70.” | Cut from provider confirmation to confirmed payment. Hold on **190 paid to provider** and **195.70 owed**. Use captions if the amounts appear on different screens. |
| 0:34–0:53 | “Later, Maria sends 400 home. She’s chosen to put 15 percent toward her loan. Her family gets 340, the lender gets 60, and she now owes 135.70.” | Show **Send money home** and the split preview. Click send, cut the wallet wait, then hold on the confirmed result and updated balance. |
| 0:53–1:00 | “On Stellar Testnet, both payments and the new balance are recorded in one transaction.” | Open the receipt for the same training request, then show the matching Testnet transaction. Keep the result legible through the end. |

## Recording checks

- Keep **Fictional bills · illustrative loan terms** visible. Use **Stellar Testnet · test USDC** only for verified footage using that asset. Say the amounts in full when timing the voiceover.
- The medical outcome describes payer responsibility. If you show a paid medical bill, verify that transaction separately.
- The selected file is fingerprinted locally. If you show provider confirmation, use the provider’s own records as the point of comparison.
- Start with a fresh loan and check its ID before sending. Use the [production checklist](solstice-devpost-production.md) for wallets, Testnet proof, and upload.
- Read the voiceover against a stopwatch and give someone one viewing. Ask who owed the exam bill, who got each share of the remittance, and where to verify the transaction.

## Historical Testnet proof

If fresh Testnet signing is unavailable, prepare a contingency cut with the current working app in mock mode and label those shots **Local demo · mock balances**. At the end, cut to **Earlier Stellar Testnet run · loan #13** and say “An earlier Testnet run recorded this same split and balance update in one transaction.” Keep the request IDs tied to their respective recordings. Organizer acceptance of this mixed-footage cut is unconfirmed. Devpost still requires a functional Testnet deployment.

- [Loan #13 paid 190 test USDC to the training provider](https://stellar.expert/explorer/testnet/tx/7a201a59249a5802b096494e61928713199612b6291f233b0645e11becff784c)
- [Loan #13 split 400 into 340 for family and 60 for the lender, leaving 135.70 owed](https://stellar.expert/explorer/testnet/tx/0e07bb9956d1e4fb301fc841b1838216da8b958b31fc071ec88423395daf22bf)
- [Request #14 paid the clinic 65 test USDC as an employer grant](https://stellar.expert/explorer/testnet/tx/a2d86b7f49f9208eec91ac34133ec9e7e4dec28d6d4087fcbe5ed4d35179dfc6)

[Pitch context](../context/pitch-context.md) · [Challenge requirements](../context/challenge-brief.md)
