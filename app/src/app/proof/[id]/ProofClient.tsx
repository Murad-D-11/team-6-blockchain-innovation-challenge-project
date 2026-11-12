"use client";
import { use, useEffect, useState } from "react";
import { AmountDisplay } from "@/components/AmountDisplay";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TxLink } from "@/components/TxLink";
import { useLaya } from "@/lib/hooks/useLaya";
import type { LayaEvent, Loan, PayoffRequest } from "@/lib/types";
import people from "@/data/people.json";
import config from "@/lib/config";
import { formatUsd } from "@/lib/units";
import { classify, provider, Verify } from "@/data/ui";

const EXPLORER = "https://stellar.expert/explorer/testnet";
const EVENT_LABEL: Record<LayaEvent["type"], string> = { request_created: "Request created", request_confirmed: "Provider confirmed", payoff: "Provider paid", remit: "Remittance", repaid: "Fully repaid" };
function payerName(l: Loan) { return l.mode==="Grant" ? people.grantFunder.name : l.funder===config.accounts.funder ? people.funder.name : l.funder; }

// Public page: no RoleGuard, reads getRequest/getLoan only, works with no wallet connected.
export default function ProofClient({params}:{params:Promise<{id:string}>}) {
 const {id}=use(params); const client=useLaya(); const [request,setRequest]=useState<PayoffRequest|null>(null); const [loan,setLoan]=useState<Loan|null>(null); const [error,setError]=useState(""); const [events,setEvents]=useState<LayaEvent[]>([]); const [eventsLoading,setEventsLoading]=useState(true);
 useEffect(()=>{let active=true; const n=Number(id); void Promise.resolve().then(()=>{setEventsLoading(true);if(!Number.isSafeInteger(n)||n<1) throw new Error("Invalid request ID.");return client.getRequest(n);}).then(async r=>{if(!active)return;setRequest(r);if(r.status==="Funded"){try{const l=await client.getLoan(n);if(active)setLoan(l);}catch(e){if(active)setError((e as Error).message);}}void client.getEvents(n).then(ev=>{if(active)setEvents(ev);}).catch(()=>{}).finally(()=>{if(active)setEventsLoading(false);});}).catch(e=>{if(active)setError((e as Error).message);});return ()=>{active=false;};},[client,id]);
 const c=request && classify(request); const p=request && provider(request.creditor);
 return (
  <PageShell title={`Public receipt #${id}`} subtitle="Stellar testnet · no wallet required">
   {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
   {!request && !error && <p className="text-sm text-muted-foreground">Loading receipt…</p>}
   {request && (
    <Card>
     <CardHeader>
      <div className="flex items-start justify-between gap-2">
       <CardTitle className="text-lg">{c?.rule?.label ?? "Bill requires review"}</CardTitle>
       <StatusBadge status={request.status} />
      </div>
     </CardHeader>
     <CardContent className="space-y-3 text-sm">
      <p>Rule and provider labels below use the current demo data; bill type is not stored on-chain.</p>
      <p>Who owed this: {c?.payer==="employer"?"Employer-owed (the employer is responsible for this cost)":c?.payer==="worker"?"Worker-payable":"Needs review"} · {c?.reason} {c?.rule && <a className="underline" href={c.rule.sourceUrl} target="_blank" rel="noreferrer">Source</a>}</p>
      <p>Provider: {p?.name ?? request.creditor} {p?.regNo && `· ${p.regNo}`}</p>
      <div><p>Invoiced:</p><AmountDisplay units={request.legalAmount} size="md" /></div>
      <p>Provider confirmation: {request.confirmedAt ? new Date(request.confirmedAt*1000).toLocaleString() : "Not confirmed"}</p>
      <p>Request status: {request.status}</p>
      {loan && <>
       <p>Paid by: {payerName(loan)} · {loan.mode}{loan.mode==="Grant"?" (no repayment)":` (flat fee ${loan.feeBps/100}%)`}</p>
       <div><p>Worker owes now:</p><AmountDisplay units={loan.outstanding} size="md" /></div>
       {loan.mode==="Grant"
        ? <p>Locked when funded: the provider was paid {formatUsd(loan.legalAmount)} test USDC as a Grant. The worker owes 0.</p>
        : <>
          <p>Locked when funded: the provider was paid {formatUsd(loan.legalAmount)} test USDC. The flat fee is {loan.feeBps/100}%, so the worker owes at most {formatUsd(loan.legalAmount + loan.legalAmount*BigInt(loan.feeBps)/10000n)} test USDC in total.</p>
          <p>Locked when funded: the worker&apos;s repayment share can&apos;t be set below {loan.minShareBps/100}% of each remittance.</p>
         </>}
      </>}
      <p className="break-all">Document fingerprint: {request.docHash}</p>
      <p>This proves the file is unchanged since the request. With the provider&apos;s confirmation and the payment, it shows the settlement happened; it does not prove the original invoice was genuine.</p>
      <Verify hash={request.docHash}/>
      <div className="space-y-1">
       <a className="block underline" href={`${EXPLORER}/contract/${config.contractId}`} target="_blank" rel="noreferrer">Contract on Stellar Expert</a>
       <a className="block underline" href={`${EXPLORER}/account/${request.creditor}`} target="_blank" rel="noreferrer">Provider account on Stellar Expert</a>
       {loan && <a className="block underline" href={`${EXPLORER}/account/${loan.funder}`} target="_blank" rel="noreferrer">Payer account on Stellar Expert</a>}
      </div>
      {eventsLoading && <p className="text-sm text-muted-foreground">Loading timeline…</p>}
      {!eventsLoading && events.length>0 && <div><h3 className="font-bold">Timeline</h3><ul className="space-y-1">{events.map((e,i)=><li key={i}>{new Date(e.timestamp*1000).toLocaleString()} · {EVENT_LABEL[e.type]} · <TxLink hash={e.txHash} label="tx" /></li>)}</ul></div>}
     </CardContent>
    </Card>
   )}
  </PageShell>
 );
}
