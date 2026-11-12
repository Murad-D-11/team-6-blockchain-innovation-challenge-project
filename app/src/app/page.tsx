import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LatestReceipts } from "./LatestReceipts";

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

export default function Home() {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-20 focus:bg-card focus:p-3">Skip to content</a>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
          <span translate="no" className="text-xl font-bold tracking-[-0.055em]">Solstice</span>
          <Link href="/dev" className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary">Demo runner</Link>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-8">
        <section className="grid items-center gap-8 border-b border-border py-9 sm:py-14 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <div>
            <h1 className="max-w-2xl text-[clamp(2.6rem,6vw,5.25rem)] leading-[0.98] font-semibold tracking-[-0.065em]">Know who pays before you leave.</h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              See which pre-departure bills your employer can cover and which may qualify for financing. Track what was paid and what you still owe.
            </p>
            <Link href="/worker/request?role=worker" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Start with your bills <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <figure className="overflow-hidden rounded-lg bg-[#193a31] text-[#f6faf3]">
            <figcaption className="border-b border-white/20 px-5 py-4 font-semibold sm:px-6">Example bill breakdown</figcaption>
            <dl className="divide-y divide-white/20 px-5 text-sm sm:px-6">
              <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 py-4">
                <dt className="font-semibold">Training</dt><dd className="text-right font-semibold tabular-nums">190 USDC</dd>
                <dd className="col-span-2 text-[#cee0d4]">Eligible for financing in this demo</dd>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 py-4">
                <dt className="font-semibold">Medical exam</dt><dd className="text-right font-semibold tabular-nums">65 USDC</dd>
                <dd className="col-span-2 text-[#cee0d4]">Employer can cover the full bill</dd>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 py-4">
                <dt className="font-semibold">Placement fee</dt><dd className="text-right font-medium">Ineligible</dd>
                <dd className="col-span-2 text-[#cee0d4]">Outside the demo funding policy</dd>
              </div>
            </dl>
          </figure>
        </section>

        <div className="grid gap-8 pt-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <section aria-labelledby="demo-roles">
            <h2 id="demo-roles" className="text-2xl font-semibold tracking-tight">Walk through the demo</h2>
            <p className="mt-1 text-sm text-muted-foreground">Fictional invoices and test USDC. Role links switch accounts in mock mode.</p>
            <ol className="mt-4 divide-y divide-border border-y border-border">
              {demoRoles.map(({ label, role, href }) => (
                <li key={href}>
                  <Link href={href} className="grid min-h-13 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-2 py-2 text-sm hover:bg-secondary">
                    <span className="font-semibold">{label}</span>
                    <span className="text-right text-xs text-muted-foreground sm:text-sm">{role}</span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="demo-receipts">
            <h2 id="demo-receipts" className="text-2xl font-semibold tracking-tight">Public receipts</h2>
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card [&>li]:px-4 [&>li]:py-3">
              <LatestReceipts />
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
