# Solstice invoice intake

## What the demo shows

Maria enters the provider, bill type, and amount, then chooses a fictional invoice PDF or photo. The browser computes a SHA-256 fingerprint and keeps the original file local. The request records the fingerprint, provider, and amount. The rulebook evaluates the fields Maria entered. The provider and funder screens infer bill type from the provider because the request does not store a bill type.

The registered provider signs to confirm the submitted amount. To check that amount, the provider needs its own records or an invoice shared separately. The contract records the provider's authorization. If a party already has the original file, it can compare the bytes with the recorded fingerprint using the app's file checker. A match establishes that the file matches the one selected at intake. It says nothing about whether the issuer is legitimate or the charge is valid.

Suggested narration: “Maria enters the bill details and chooses a sample invoice. Solstice records a fingerprint of the file. The provider confirms the submitted amount before it can be paid.”

## What a pilot needs

Start with one participating provider and structured invoice fields: provider identity, invoice number and date, charge type, amount, and currency. Confirm these against the provider's records before routing payment. Check for an invoice already paid or financed, and send ambiguous charges or unclear payer responsibility for manual review. Give the provider enough information to identify the invoice and an approved way to exchange it when necessary. Keep original invoices and identifying details in access-controlled storage.

Once sample invoices from participating providers show where typing slows workers down, use PDF text extraction for digital invoices and OCR for scanned invoices or photos. Use either to prefill the fields, then let the worker correct them and the provider confirm the invoice. Keep manual entry available when a document is difficult to read. Validate the fee rules against the issuer and jurisdiction separately from extracting the fields.

## Demo checks

- Choose a fictional invoice and confirm the UI describes local fingerprinting. Enter its amount manually and confirm the resulting request shows that amount.
- Confirm from the assigned provider account and check that the request changes from Open to Confirmed. A different account should be unable to confirm it.
- If demonstrating fingerprint matching, compare the original file and a different file. Show the matching and mismatching results as file comparisons.
- Confirm that the scoped placement-fee example is refused by the worker app. This rule is enforced by the app in the prototype.
