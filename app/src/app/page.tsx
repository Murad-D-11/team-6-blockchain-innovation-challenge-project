import Link from "next/link";
import { LatestReceipts } from "./LatestReceipts";
import { NewestReceiptLink } from "./NewestReceiptLink";
import { buttonVariants } from "@/components/ui/button";
import { DustField } from "@/components/DustField";
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

const sides = [
  { who: "Worker", why: "No cash upfront and no high-interest lender. She repays only when she sends money home, at most 15% of each transfer." },
  { who: "Remittance partner (funder)", why: "Pays the bills and wins a customer for years. It is repaid through transfers it already carries, on terms it can't break, so workers can trust it." },
  { who: "Employer (optional)", why: "Can pay the costs it already owes straight to the clinic before the helper leaves. A helper who starts without a high-interest loan is less likely to bring debt collectors to its door." },
];

const enforced = [
  "Only the worker can send money. The funder can never take money from her account.",
  "The repayment share is at most 15% and can't drop below the share she agreed.",
  "The fee is at most 8% and is locked when the bill is paid.",
  "The funder never receives more than is owed.",
  "Money goes only to a registered provider, after it confirms the exact amount.",
  "Each bill can be paid only once.",
  "Every transfer splits between the funder and the family in one transaction.",
];

// Demo numbers for the slip (test USDC). Display only; the contract does the real maths.
const bills = [
  {
    name: "Training",
    amount: "190.00",
    who: "RemitCo pays the training centre. Maria owes 195.70: the 190 plus a one-time 3% fee.",
    stamp: "Paid",
    tone: "olive",
  },
  {
    name: "Medical exam",
    amount: "65.00",
    who: "Her employer can pay the clinic. If it does, Maria owes nothing for this bill.",
    stamp: "Employer can pay",
    tone: "olive",
  },
  {
    name: "Philippine recruiter placement fee",
    amount: "none",
    who: "Outside the demo funding policy, so RemitCo does not pay it.",
    stamp: "Not paid",
    tone: "clay",
  },
] as const;

// "Follow one loan" steps. Step 5 has no fixed href: it links to the newest public receipt once one exists.
const steps: { label: string; who: string; href: string | null }[] = [
  { label: "Maria checks her bills", who: "Worker", href: "/worker/request?role=worker" },
  { label: "The training centre confirms its amount", who: "Provider", href: "/creditor?role=creditor" },
  { label: "RemitCo pays the training centre directly", who: "Funder", href: "/funder?role=funder" },
  { label: "Maria sends 400 home", who: "Worker", href: "/worker?role=worker" },
  { label: "Anyone checks the receipt on Stellar", who: "Public", href: null },
];

const ticketLink =
  "mt-3 block min-h-11 font-semibold underline decoration-[var(--slip-rule)] underline-offset-4 after:absolute after:inset-0 after:content-['']";

// One container for every section, hero included.
const container = "mx-auto w-full max-w-6xl px-4 sm:px-8";

export default function Home() {
  return (
    <div className="home flex-1">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-20 focus:bg-card focus:p-3">Skip to content</a>

      <div className="field relative isolate">
        <DustField />
        <header className={cn(container, "relative z-10 flex min-h-14 items-center")}>
          <span translate="no" className="display text-xl font-semibold tracking-tight">Solstice</span>
        </header>

        <div className={cn(container, "grid gap-8 pt-6 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-0 lg:pt-10")}>
          <div className="relative z-10 lg:col-start-1 lg:row-start-1 lg:self-center lg:pb-10">
            <h1 id="home-title" data-dust-quiet className="home-title display">Know who pays before you leave.</h1>
            <p data-dust-quiet className="field-muted mt-4 max-w-md text-lg leading-snug">
              Check which bills your employer can cover and which qualify for financing.
            </p>
            <Link
              href="/worker/request?role=worker"
              className={cn(buttonVariants({ size: "lg" }), "signal-button mt-6 min-h-12 px-6 text-base")}
            >
              Start with your bills
            </Link>
          </div>

          <div className="relative z-20 -mb-3 lg:col-start-2 lg:row-start-1">
            <section className="slip perf-join px-5 pt-5 pb-6 sm:px-8 sm:pt-7" aria-labelledby="slip-title">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="slip-title" className="display text-xl font-semibold">Maria&apos;s remittance slip</h2>
                <p className="figure slip-muted text-xs">Test USDC</p>
              </div>

              <ol className="slip-rule mt-4 divide-y divide-[var(--slip-rule)] border-y border-[var(--slip-rule)]">
                {bills.map(({ name, amount, who, stamp, tone }) => (
                  <li key={name} className="py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="display text-lg leading-snug font-semibold">{name}</span>
                      <span className="figure text-base">{amount}</span>
                    </div>
                    <div className="mt-2 grid items-center gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <p className="slip-muted text-sm leading-snug">{who}</p>
                      <span className={cn("stamp justify-self-start sm:justify-self-end", tone === "clay" ? "stamp-clay" : "stamp-olive")}>{stamp}</span>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="figure slip-muted mt-5 text-xs">Stellar testnet demo. Fictional people, test tokens.</p>
            </section>
          </div>

          <div className="stub-wrap relative z-10 -mb-10 lg:col-span-2 lg:row-start-2">
            <section className="stub px-5 pt-12 pb-8 sm:px-8" aria-labelledby="stub-title">
              <div className="grid gap-8 lg:grid-cols-[1.05fr_1.2fr_1fr] lg:gap-0 lg:divide-x lg:divide-dashed lg:divide-[var(--slip-rule)]">
                <div className="lg:pr-8">
                  <h2 id="stub-title" className="display text-xl font-semibold">Then Maria sends 400 home</h2>
                  <p className="slip-muted mt-1 text-sm">One transfer at a 15% share, split in one transaction.</p>
                  <p className="mt-4">
                    <span className="slip-total num inline-block">400.00</span>
                  </p>
                </div>

                <div className="border-t-2 border-dashed border-[var(--slip-rule)] pt-8 lg:border-t-0 lg:px-8 lg:pt-0">
                  <div className="grid h-full grid-cols-[4.5rem_minmax(0,1fr)] items-stretch gap-3">
                    <svg viewBox="0 0 80 90" preserveAspectRatio="none" className="h-full min-h-28 w-full" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M0 45 H28 M28 45 V22.5 H80 M28 45 V67.5 H80" vectorEffect="non-scaling-stroke" />
                    </svg>
                    <div className="flex flex-col justify-around gap-4">
                      <p>
                        <span className="num block text-4xl leading-none">340.00</span>
                        <span className="slip-muted block pt-1 text-sm">to Lorna</span>
                      </p>
                      <p>
                        <span className="num block text-4xl leading-none">60.00</span>
                        <span className="slip-muted block pt-1 text-sm">to RemitCo</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t-2 border-dashed border-[var(--slip-rule)] pt-8 lg:border-t-0 lg:pt-0 lg:pl-8">
                  <p className="text-sm font-semibold">What Maria owes RemitCo</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
                    <span className="num slip-muted text-2xl line-through decoration-1">195.70</span>
                    <span aria-hidden="true" className="slip-muted text-sm">to</span>
                    <span className="sr-only">down to</span>
                    <span className="num text-4xl leading-none">135.70</span>
                  </p>
                  <div className="mt-3 flex h-3 border border-[var(--slip-ink)]" role="img" aria-label="135.70 of 195.70 still owed, 60.00 repaid by this transfer">
                    <span className="bg-[var(--sol-blue-pale)]" style={{ width: "69.3%" }} />
                    <span className="border-l-2 border-dashed border-[var(--slip-ink)]" style={{ width: "30.7%" }} />
                  </div>
                  <p className="slip-muted mt-2 text-sm">The dashed part is the 60.00 this transfer repays.</p>
                </div>
              </div>
            </section>
          </div>
        </div>
        <div className="rule-double absolute inset-x-0 bottom-0" aria-hidden="true" />
      </div>

      <main id="main-content" tabIndex={-1}>
        <section className="pt-20 pb-14 lg:pt-24 lg:pb-20" aria-labelledby="follow-loan">
          <div className={container}>
            <h2 id="follow-loan" className="home-h2 border-b-2 border-foreground pb-2">Follow one loan, start to finish</h2>
            <ol className="trail-row relative mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {steps.map(({ label, who, href }, i) => (
                <li key={label} className="ticket flex flex-col">
                  <div className="flex-1 px-4 pt-4 pb-5">
                    <span aria-hidden="true" className="num block text-5xl leading-none">{i + 1}</span>
                    {href ? (
                      <Link href={href} className={ticketLink}>
                        {label}
                      </Link>
                    ) : (
                      <NewestReceiptLink label={label} className={ticketLink} />
                    )}
                  </div>
                  <div className="perf-ticket" aria-hidden="true" />
                  <div className="px-4 py-3">
                    <span className="stamp stamp-ink">{who}</span>
                  </div>
                </li>
              ))}
            </ol>

            <details className="invoice-item mt-10 border-y border-border">
              <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 font-semibold">
                Test every role (mock mode)
                <span className="invoice-marker" aria-hidden="true" />
              </summary>
              <p className="pb-2 text-base text-muted-foreground">Role links switch accounts in mock mode.</p>
              <ol className="grid gap-x-10 pb-4 sm:grid-cols-2">
                {demoRoles.map(({ label, role, href }) => (
                  <li key={href} className="border-t border-border first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
                    <Link href={href} className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 py-2 hover:bg-card">
                      <span className="font-semibold underline decoration-border underline-offset-4">{label}</span>
                      <span className="text-right text-sm text-muted-foreground">{role}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </details>

            <section className="mt-14 lg:mt-20" aria-labelledby="demo-receipts">
              <h2 id="demo-receipts" className="home-h2 border-b-2 border-foreground pb-2">Public receipts</h2>
              <p className="pt-2 text-base text-muted-foreground">Track what was paid and what the worker still owes.</p>
              <p className="pb-2 text-base font-semibold">Every payment can be checked on Stellar Expert</p>
              <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <LatestReceipts />
              </ul>
            </section>
          </div>
        </section>

        <div className="rule-double" aria-hidden="true" />

        <section className="field py-14 lg:py-20" aria-labelledby="why-each-side">
          <div className={container}>
            <h2 id="why-each-side" className="home-h2 border-b-2 border-[var(--field-ink)] pb-2">Why each side uses Solstice</h2>
            <ul className="mt-8 grid gap-10 lg:grid-cols-3 lg:gap-12">
              {sides.map(({ who, why }, i) => {
                const optional = i === 2;
                return (
                  <li key={who} className={cn("border-t-[3px] border-[var(--field-ink)] pt-4", optional && "border-dashed")}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <h3 className="display text-2xl leading-tight font-semibold">{who}</h3>
                      {optional && <span className="tag-optional">Optional</span>}
                    </div>
                    <p className="field-muted mt-3 text-base leading-relaxed">{why}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <div className="rule-double" aria-hidden="true" />

        <section className="py-14 lg:py-20" aria-labelledby="contract-vs-app">
          <div className={container}>
            <h2 id="contract-vs-app" className="home-h2 border-b-2 border-foreground pb-2">What the contract enforces, and what the app checks</h2>
            <div className="mt-8 grid items-stretch gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
              <section className="slip px-5 py-6 sm:px-8" aria-labelledby="enforced-title">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                  <h3 id="enforced-title" className="display text-xl font-semibold">Enforced by the Stellar contract</h3>
                  <span className="stamp stamp-olive">Enforced</span>
                </div>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-snug lg:columns-2 lg:gap-10">
                  {enforced.map((line) => (
                    <li key={line} className="break-inside-avoid">{line}</li>
                  ))}
                </ul>
              </section>
              <section className="slip px-5 py-6 sm:px-8" aria-labelledby="checked-title">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                  <h3 id="checked-title" className="display text-xl font-semibold">Checked by the app, not the contract</h3>
                  <span className="stamp stamp-clay">App checks</span>
                </div>
                <p className="mt-4 text-lg leading-snug">
                  The funder&apos;s policy: which bills it pays, and the most it pays for each. Solstice records only what runs through it, so it can&apos;t stop a recruiter asking for cash elsewhere.
                </p>
              </section>
            </div>
          </div>
        </section>
      </main>

      <div className="rule-double" aria-hidden="true" />
      <footer className="home-footer">
        <p className={cn(container, "py-8 text-sm")}>Fictional invoices and test USDC.</p>
      </footer>
    </div>
  );
}
