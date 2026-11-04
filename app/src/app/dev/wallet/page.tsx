"use client";

import { useState } from "react";
import { connectFreighter } from "@/lib/client/wallet";
import { getUsdcBalance, hasUsdcTrustline } from "@/lib/client/horizon";
import { fromUnits } from "@/lib/units";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function DevWalletPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [reads, setReads] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    setAddress(null);
    setReads(null);
    try {
      setAddress(await connectFreighter());
      setNetwork("OK: Freighter is on Testnet");
    } catch (e) {
      setNetwork(`Error: ${msg(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function read() {
    if (!address) return;
    setBusy(true);
    try {
      const [bal, trust] = await Promise.all([getUsdcBalance(address), hasUsdcTrustline(address)]);
      setReads(`balance: ${fromUnits(bal, 7)} USDC (${bal} units)\ntrustline: ${trust}`);
    } catch (e) {
      setReads(`Error: ${msg(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const btn = "rounded bg-black px-4 py-2 text-white disabled:opacity-40";
  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Dev: wallet</h1>
      <p className="text-sm text-gray-600">Calls Freighter and Horizon directly. Ignores NEXT_PUBLIC_USE_MOCK.</p>
      <button className={btn} onClick={connect} disabled={busy}>Connect Freighter</button>
      {network && <p className="text-sm">Network check: {network}</p>}
      {address && <p className="break-all font-mono text-sm">Address: {address}</p>}
      <button className={btn} onClick={read} disabled={busy || !address}>Read balance and trustline</button>
      {reads && <pre className="whitespace-pre-wrap rounded bg-gray-100 p-3 text-sm">{reads}</pre>}
    </main>
  );
}
