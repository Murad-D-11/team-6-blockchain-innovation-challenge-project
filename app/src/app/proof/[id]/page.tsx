"use client";
import { use, useEffect, useState } from "react";
import { useLaya } from "@/lib/hooks/useLaya";
import type { Loan, PayoffRequest } from "@/lib/types";
import config from "@/lib/config";
import { amount, card, classify, provider, Verify } from "@/data/ui";

export default function ProofPage({params}:{params:Promise<{id:string}>}) {
 const {id}=use(params); const client=useLaya(); const [request,setRequest]=useState<PayoffRequest|null>(null); const [loan,setLoan]=useState<Loan|null>(null); const [error,setError]=useState("");
 useEffect(()=>{let active=true; const n=Number(id); void Promise.resolve().then(()=>{if(!Number.isSafeInteger(n)||n<1) throw new Error("Invalid request ID.");return client.getRequest(n);}).then(async r=>{if(!active)return;setRequest(r);if(r.status==="Funded"){try{const l=await client.getLoan(n);if(active)setLoan(l);}catch(e){if(active)setError((e as Error).message);}}}).catch(e=>{if(active)setError((e as Error).message);});return ()=>{active=false;};},[client,id]);
 const c=request && classify(request); const p=request && provider(request.creditor);
 return <main className="mx-auto max-w-3xl space-y-5 p-6"><h1 className="text-3xl font-bold">Public receipt #{id}</h1><p>Stellar testnet · no wallet required</p>{error && <p role="alert">{error}</p>}{!request && !error && <p>Loading receipt…</p>}{request && <section className={card}><h2 className="font-bold">{c?.rule?.label ?? "Bill requires review"}</h2><p>Rule and provider labels below use the current demo data; bill type is not stored on-chain.</p><p>Rule: {c?.payer} · {c?.reason} {c?.rule && <a className="underline" href={c.rule.sourceUrl} target="_blank" rel="noreferrer">Source</a>}</p><p>Provider: {p?.name ?? request.creditor} {p?.regNo && `· ${p.regNo}`}</p><p>Invoiced: {amount(request.legalAmount)} USDC</p><p>Provider confirmation: {request.confirmedAt ? new Date(request.confirmedAt*1000).toLocaleString() : "Not confirmed"}</p><p>Request status: {request.status}</p>{loan && <><p>Paid by: {loan.funder} · {loan.mode}</p><p>Worker owes now: {amount(loan.outstanding)} USDC</p></>}<p className="break-all">Document fingerprint: {request.docHash}</p><p>A matching fingerprint shows the file has not changed since the request. Provider confirmation and payment are recorded separately; the fingerprint does not prove the original invoice was genuine.</p><Verify hash={request.docHash}/><a className="underline" href={`https://stellar.expert/explorer/testnet/contract/${config.contractId}`} target="_blank" rel="noreferrer">View contract on Stellar Expert</a></section>}</main>;
}

