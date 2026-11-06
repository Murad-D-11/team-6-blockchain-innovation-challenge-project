"use client";
import { useCallback, useEffect, useState } from "react";
import { useLaya } from "@/lib/hooks/useLaya";
import { useWallet } from "@/lib/hooks/useWallet";
import type { PayoffRequest } from "@/lib/types";
import config from "@/lib/config";
import { amount, button, card, classify } from "@/data/ui";

export default function ProviderPage() {
 const client = useLaya(); const { address, role } = useWallet();
 const [requests,setRequests] = useState<PayoffRequest[]>([]); const [message,setMessage] = useState(""); const [tx,setTx] = useState(""); const [busy,setBusy] = useState(false);
 const refresh = useCallback(async () => { try { setRequests(await client.listRequests()); } catch(e) { setMessage((e as Error).message); } },[client]);
 useEffect(() => { void Promise.resolve().then(refresh); },[refresh,address]);
 async function confirm(id:number) { setBusy(true); setMessage(""); setTx(""); try { const r=await client.confirmRequest(id); setTx(r.txHash); await refresh(); } catch(e) { setMessage((e as Error).message); } finally { setBusy(false); } }
 return <main className="mx-auto max-w-3xl space-y-5 p-6"><h1 className="text-3xl font-bold">Provider</h1><p>Testnet · {address ?? "No wallet connected"}</p><button className={button} onClick={() => void client.connect().catch(e => setMessage(e.message))}>{address ? "Reconnect / switch wallet" : "Connect wallet"}</button>{role !== "creditor" && <p>Switch to a provider account to confirm invoices.</p>}{message && <p role="alert">{message}</p>}{tx && (process.env.NEXT_PUBLIC_USE_MOCK === "true" ? <p>Mock transaction complete.</p> : <a className="underline" href={config.explorerTxUrl+tx} target="_blank" rel="noreferrer">View transaction</a>)}{requests.filter(r => r.creditor === address && r.status === "Open").map(r => <section className={card} key={r.id}><h2 className="font-bold">Request #{r.id}: {classify(r).rule?.label ?? "Unknown bill"}</h2><p>Invoice amount: {amount(r.legalAmount)} USDC</p><p>By confirming, you state that the invoice amount is exactly this.</p><button className={button} disabled={busy || role !== "creditor"} onClick={() => void confirm(r.id)}>{busy ? "Confirming…" : "Confirm invoice"}</button></section>)}{!requests.some(r=>r.creditor===address && r.status==="Open") && <p>No open requests for this provider.</p>}</main>;
}
