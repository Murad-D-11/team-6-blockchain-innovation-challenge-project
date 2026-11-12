"use client";

import { use, useEffect, useState } from "react";
import { AmountDisplay } from "@/components/AmountDisplay";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { TxLink } from "@/components/TxLink";
import { useLaya } from "@/lib/hooks/useLaya";
import type { LayaEvent, Loan, PayoffRequest } from "@/lib/types";
import people from "@/data/people.json";
import config from "@/lib/config";
import { formatUsd } from "@/lib/units";
import { classify, provider, Verify } from "@/data/ui";

const EXPLORER = "https://stellar.expert/explorer/testnet";
const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const EVENT_LABEL: Record<LayaEvent["type"], string> = {
  request_created: "Request created",
  request_confirmed: "Provider confirmed",
  payoff: "Provider paid",
  remit: "Remittance sent",
  repaid: "Fully repaid",
};

function payerName(loan: Loan) {
  if (loan.mode === "Grant") return people.grantFunder.name;
  return loan.funder === config.accounts.funder ? people.funder.name : loan.funder;
}

export default function ProofClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Receipt key={id} id={id} />;
}

function Receipt({ id }: { id: string }) {
  const client = useLaya();
  const [request, setRequest] = useState<PayoffRequest | null>(null);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<LayaEvent[] | null>(null);
  const [eventsError, setEventsError] = useState(false);

  useEffect(() => {
    let active = true;
    const requestId = Number(id);
    async function loadReceipt() {
      try {
        if (!Number.isSafeInteger(requestId) || requestId < 1) throw new Error("Invalid request ID.");
        const result = await client.getRequest(requestId);
        if (!active) return;
        setRequest(result);

        if (result.status === "Funded") {
          void client.getLoan(requestId).then((fundedLoan) => {
            if (active) setLoan(fundedLoan);
          }).catch(() => {
            if (active) setError("Payment details are unavailable. Refresh to try again.");
          });
        }

        try {
          const history = await client.getEvents(requestId);
          if (active) setEvents(history);
        } catch {
          if (active) setEventsError(true);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load this receipt.");
      }
    }
    void loadReceipt();
    return () => { active = false; };
  }, [client, id]);

  return (
    <PageShell
      title={`Receipt #${id}`}
      subtitle={IS_MOCK ? "Demo receipt with fictional payments. You can view it without a wallet." : "Public record on Stellar Testnet. You can view it without a wallet."}
      publicView
    >
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!request && !error && <p role="status" className="text-sm text-muted-foreground">Loading receipt…</p>}
      {request && (
        <article className="overflow-hidden rounded-lg border border-border bg-card">
          <Settlement request={request} loan={loan} />
          <section className="border-t border-border p-5 sm:p-7" aria-labelledby="activity">
            <h2 id="activity" className="text-lg font-semibold tracking-tight">Activity</h2>
            {eventsError ? <p className="mt-2 text-sm text-muted-foreground">Activity is unavailable. Refresh to try again.</p>
              : !events ? <p role="status" className="mt-2 text-sm text-muted-foreground">Loading activity…</p>
              : events.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No activity is available for this request.</p>
              : <ol className="mt-2 divide-y divide-border">
                {events.map((event, index) => (
                  <li key={index} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
                    <div>
                      <p className="font-medium">{EVENT_LABEL[event.type]}</p>
                      <time className="text-muted-foreground" dateTime={new Date(event.timestamp * 1000).toISOString()}>{dateTime.format(event.timestamp * 1000)}</time>
                    </div>
                    <TxLink hash={event.txHash} label="View transaction" />
                  </li>
                ))}
              </ol>}
          </section>
          <section className="space-y-3 border-t border-border p-5 text-sm sm:p-7" aria-labelledby="verify-receipt">
            <h2 id="verify-receipt" className="text-lg font-semibold tracking-tight">Verify this receipt</h2>
            <p className="text-muted-foreground">Compare your invoice with the fingerprint recorded for this request. A match shows the file is unchanged since submission. Provider confirmation and payment are recorded separately.</p>
            <Verify hash={request.docHash} />
            <details className="border-t border-border pt-3">
              <summary className="cursor-pointer font-medium hover:text-primary">Fingerprint and Stellar records</summary>
              <p className="mt-3 font-mono text-xs wrap-anywhere">{request.docHash}</p>
              <ul className="mt-3 space-y-2 text-primary [&_a]:underline [&_a]:underline-offset-3">
                <li><a href={`${EXPLORER}/contract/${config.contractId}`} target="_blank" rel="noreferrer">Contract on Stellar Expert</a></li>
                <li><a href={`${EXPLORER}/account/${request.creditor}`} target="_blank" rel="noreferrer">Provider account on Stellar Expert</a></li>
                {loan && <li><a href={`${EXPLORER}/account/${loan.funder}`} target="_blank" rel="noreferrer">Payer account on Stellar Expert</a></li>}
              </ul>
            </details>
          </section>
        </article>
      )}
    </PageShell>
  );
}

function Settlement({ request, loan }: { request: PayoffRequest; loan: Loan | null }) {
  const classification = classify(request);
  const billProvider = provider(request.creditor);
  const responsibility = classification.payer === "employer" ? "Employer" : classification.payer === "worker" ? "Worker" : "Needs review";
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-7">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight">{classification.rule?.label ?? "Bill requires review"}</h2>
          <p className="mt-1 text-sm wrap-anywhere text-muted-foreground">{billProvider?.name ?? request.creditor}{billProvider?.regNo && ` · ${billProvider.regNo}`}</p>
        </div>
        <StatusBadge status={request.status} />
      </header>
      <dl className="grid gap-4 border-y border-border bg-secondary/60 p-5 sm:grid-cols-2 sm:p-7">
        <div>
          <dt className="mb-1 text-sm text-muted-foreground">{loan ? "Provider paid" : "Invoice amount"}</dt>
          <dd><AmountDisplay units={loan?.legalAmount ?? request.legalAmount} size="lg" /></dd>
        </div>
        {loan && <div>
          <dt className="mb-1 text-sm text-muted-foreground">Worker owes now</dt>
          <dd><AmountDisplay units={loan.outstanding} size="lg" /></dd>
        </div>}
      </dl>
      <dl className="divide-y divide-border px-5 text-sm sm:px-7">
        <div className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr]">
          <dt className="text-muted-foreground">Responsible for the bill</dt>
          <dd>{responsibility}. {classification.reason} {classification.rule && <a className="text-primary underline underline-offset-3" href={classification.rule.sourceUrl} target="_blank" rel="noreferrer">Policy source</a>}</dd>
        </div>
        <div className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr]">
          <dt className="text-muted-foreground">Provider confirmation</dt>
          <dd>{request.confirmedAt ? dateTime.format(request.confirmedAt * 1000) : "Awaiting confirmation"}</dd>
        </div>
        {loan && <>
          <div className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr]">
            <dt className="text-muted-foreground">Paid by</dt>
            <dd className="wrap-anywhere">{payerName(loan)}</dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr]">
            <dt className="text-muted-foreground">Terms at payment</dt>
            <dd>{loan.mode === "Grant" ? "Grant. The worker has no repayment." : `Loan with a ${loan.feeBps / 100}% flat fee. The total due at funding was ${formatUsd(loan.legalAmount + loan.legalAmount * BigInt(loan.feeBps) / 10000n)} test USDC. The minimum repayment share is ${loan.minShareBps / 100}% of each remittance.`}</dd>
          </div>
        </>}
      </dl>
      <p className="px-5 pt-2 pb-5 text-xs text-muted-foreground sm:px-7">Bill categories and provider labels come from the current demo records.</p>
    </>
  );
}
