# Shared components (owner: Ananya)

Import from `@/components/...`. Luke: use these on your pages; ask Ananya for changes.

| File | What it is |
| --- | --- |
| `PageShell` | Page frame: header with role (creditor shows as "Provider"), short address, Testnet badge, Connect button. `<PageShell title="…" subtitle="…">` |
| `RoleGuard` | `<RoleGuard role="funder">…</RoleGuard>` shows "Switch Freighter to the Funder account" when the role is wrong |
| `AmountDisplay` | `<AmountDisplay units={bigint} size="sm|md|lg" />` USD with PHP underneath, labelled illustrative |
| `TxLink` | `<TxLink hash={txHash} />` stellar.expert link (marked "mock" on the mock) |
| `StatusBadge` | `<StatusBadge status="Open|Confirmed|Funded|Cancelled|Active|Repaid|Paused|Overdue" detail="1 of 3" />`, plus `loanDisplayStatus(loan, max)` and `<LoanStatusBadge loan max />` |
| `TxStatus` | Under a write button: loading line, then the tx link or a friendly error |
| `useTx` | `const tx = useTx<TxResult>(); await tx.run(() => laya.confirmRequest(id))` gives `busy`, `error` (friendly LayaError text), `result` |
| `errors.ts` | `errorText(e)` friendly text for any thrown error |
| `hooks.ts` | `usePoll(fn, ms)` refresh every few seconds; `useMounted()` |
| `demoData.ts` | Typed `PROVIDERS`, `RULES`, `PEOPLE` from Luke's `app/src/data/*.json`, plus `providerName`, `payerName`, `firstName`, `SAMPLE_INVOICES` |
| `ui/*` | shadcn-style `Button`, `Card*`, `Input`, `Select`, `Slider`, `Label`, `Badge`, `Tabs*`, `Table*` |

The `ui/*` files are hand-written in shadcn style (same names and props) so that no new npm packages are needed.
