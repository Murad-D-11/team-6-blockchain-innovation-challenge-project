import Link from "next/link";
import { LatestReceipts } from "./LatestReceipts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DemoLink = { label: string; note: string; href?: string };

// Demo script order (docs/PLAN-v2.md). Items without an href render as plain text with "coming soon".
// When /worker or /family exist, add their href here to turn them into links.
const demo: DemoLink[] = [
  { label: "Worker", note: "List the bills; the placement fee is refused", href: "/worker/request?role=worker" },
  { label: "Provider: training center", note: "Confirm the 190 USDC invoice", href: "/creditor?role=creditor" },
  { label: "Provider: clinic", note: "Confirm the 65 USDC invoice", href: "/creditor?role=clinic" },
  { label: "Funder (Loan)", note: "Fund the training bill at a flat fee", href: "/funder?role=funder" },
  { label: "Employer (Grant)", note: "Pay the medical exam; the worker owes 0", href: "/funder?role=employer" },
];

// Rendered after the receipts, which sit between the Employer and Worker dashboard steps.
const demoAfter: DemoLink[] = [
  { label: "Worker dashboard", note: "Send money home and see the repayment", href: "/worker?role=worker" },
  { label: "Family", note: "Lorna's balance goes up" },
  { label: "Admin", note: "Rulebook and verified providers", href: "/admin?role=admin" },
  { label: "Dev", note: "Run the whole flow on the mock", href: "/dev" },
];

function renderItem(d: DemoLink) {
  return (
    <li key={d.label}>
      {d.href ? (
        <Link href={d.href} className="font-medium text-blue-600 underline">
          {d.label}
        </Link>
      ) : (
        <span className="font-medium">
          {d.label} <span className="text-sm font-normal text-muted-foreground">(coming soon)</span>
        </span>
      )}
      <span className="block text-sm text-muted-foreground">{d.note}</span>
    </li>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Laya</h1>
        <p>
          Laya sorts a migrant worker&apos;s pre-departure bills by a published rulebook and sends each one to
          whoever legally owes it. It then pays the provider directly, so the worker owes only the principal.
        </p>
        <p role="note" className="rounded-md border border-border bg-muted p-3 text-sm">
          Stellar testnet demo with fictional people and test tokens.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Demo, in script order</CardTitle>
          <CardDescription>The role in each link picks the account to act as.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {demo.map(renderItem)}
            <LatestReceipts />
            {demoAfter.map(renderItem)}
          </ol>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Dev note: add <code>?mockReset=1</code> to any URL to wipe the mock&apos;s saved state.
      </p>
    </main>
  );
}
