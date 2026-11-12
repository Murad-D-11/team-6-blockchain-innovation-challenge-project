import Link from "next/link";
import { LatestReceipts } from "./LatestReceipts";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const demoRoles = [
  { label: "Submit bills", role: "Worker", href: "/worker/request?role=worker" },
  { label: "Confirm the training invoice", role: "Training provider", href: "/creditor?role=creditor" },
  { label: "Confirm the medical invoice", role: "Clinic", href: "/creditor?role=clinic" },
  { label: "Finance the training bill", role: "Funder", href: "/funder?role=funder" },
  { label: "Pay for the medical exam", role: "Employer", href: "/funder?role=employer" },
  { label: "Send money home", role: "Worker", href: "/worker?role=worker" },
  { label: "See money received", role: "Family", href: "/family?role=family" },
  { label: "Manage provider approvals", role: "Admin", href: "/admin?role=admin" },
];

const sampleBills = [
  { name: "Training", amount: "190 USDC", decision: "Eligible for financing" },
  { name: "Medical exam", amount: "65 USDC", decision: "Employer can cover the full bill" },
  { name: "Placement fee", amount: null, decision: "Outside the demo funding policy" },
];

export default function Home() {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-20 focus:bg-card focus:p-3">Skip to content</a>
      <header className="masthead">
        <div className="mx-auto flex min-h-15 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
          <span translate="no" className="text-2xl font-semibold tracking-tight">Solstice</span>
          <Link href="/dev" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 hover:no-underline">Demo runner</Link>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pt-6 pb-14 sm:px-8 sm:pt-12">
        <section className="register-sheet lg:grid lg:min-h-[650px] lg:grid-rows-[1fr_auto]" aria-labelledby="bill-register">
          <div className="flex flex-wrap items-end justify-between gap-5 px-4 pt-6 pb-5 sm:px-9 sm:pt-9 sm:pb-8 lg:items-center">
            <div>
              <h1 id="bill-register" className="register-heading font-semibold">Know who pays<br className="hidden sm:block" /> before you leave.</h1>
              <p className="editorial-copy mt-3">Check which bills your employer can cover and which qualify for financing.</p>
            </div>
            <Link href="/worker/request?role=worker" className={cn(buttonVariants({ size: "lg" }), "shrink-0")}>Start with your bills</Link>
          </div>
          <div className="px-4 pb-5 sm:px-9 sm:pb-8 lg:pb-12">
            <table className="w-full table-fixed border-collapse text-left">
              <caption className="register-label border-b-2 border-foreground pb-2 text-left text-lg font-semibold">Example bill breakdown</caption>
              <thead className="register-label text-base text-muted-foreground">
                <tr className="border-b border-border">
                  <th scope="col" className="w-[37%] py-2 pr-2 font-medium">Bill</th>
                  <th scope="col" className="w-[37%] py-2 pr-2 font-medium sm:w-auto">Payment decision</th>
                  <th scope="col" className="py-2 text-right font-medium sm:w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sampleBills.map(({ name, amount, decision }) => (
                  <tr key={name} className="border-b border-border align-top">
                    <th scope="row" className="register-label py-3 pr-2 text-lg font-semibold leading-tight lg:py-5">{name}</th>
                    <td className="py-3 pr-2 text-sm leading-snug sm:text-base lg:py-5">{decision}</td>
                    <td className="register-figure py-3 text-right text-sm lg:py-5">{amount ?? <span className="font-sans">None</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-9 grid gap-8 lg:mt-32 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-12">
          <section aria-labelledby="demo-roles">
            <h2 id="demo-roles" className="border-b-2 border-foreground pb-2 text-2xl font-semibold tracking-tight lg:text-[length:var(--text-section)]">Walk through the demo</h2>
            <p className="py-2 text-sm text-muted-foreground">Role links switch accounts in mock mode.</p>
            <ol className="divide-y divide-border border-b border-border">
              {demoRoles.map(({ label, role, href }) => (
                <li key={href}>
                  <Link href={href} className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 py-2 hover:bg-card">
                    <span className="font-semibold underline decoration-border underline-offset-4">{label}</span>
                    <span className="text-right text-sm text-muted-foreground">{role}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="demo-receipts">
            <h2 id="demo-receipts" className="border-b-2 border-foreground pb-2 text-2xl font-semibold tracking-tight lg:text-[length:var(--text-section)]">Public receipts</h2>
            <p className="py-2 text-sm text-muted-foreground">Track what was paid and what the worker still owes.</p>
            <ul className="divide-y divide-border border-b border-border [&>li]:py-3">
              <LatestReceipts />
            </ul>
          </section>
        </div>
        <footer className="mt-10 border-t border-border py-4 text-sm text-muted-foreground lg:mt-36">
          Fictional invoices and test USDC.
        </footer>
      </main>
    </>
  );
}
