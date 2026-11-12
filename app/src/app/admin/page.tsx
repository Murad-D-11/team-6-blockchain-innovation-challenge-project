"use client";
import { useCallback, useEffect, useState } from "react";
import { errorText } from "@/components/errors";
import { PageShell } from "@/components/PageShell";
import { RoleGuard } from "@/components/RoleGuard";
import { TxStatus } from "@/components/TxStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTx } from "@/components/useTx";
import { useLaya } from "@/lib/hooks/useLaya";
import { LayaError } from "@/lib/types";
import type { TxResult } from "@/lib/types";
import { isValidAccount } from "@/lib/address";
import { providerData, ruleData } from "@/data/ui";

export default function AdminPage() {
  const client = useLaya();
  const [registered, setRegistered] = useState<Record<string, boolean>>({});
  const [candidate, setCandidate] = useState("");
  const [period, setPeriod] = useState("60");
  const [pause, setPause] = useState("3");
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const tx = useTx<TxResult>();

  const refresh = useCallback(async () => {
    try {
      const entries = await Promise.all(providerData.filter((p) => p.address).map(async (p) => [p.address!, await client.isCreditor(p.address!)] as const));
      setRegistered(Object.fromEntries(entries));
      const c = await client.getConfig();
      setPeriod(String(c.periodSecs));
      setPause(String(c.maxPausePeriods));
      setLoadError(null);
    } catch (e) { setLoadError(errorText(e)); }
  }, [client]);
  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

  async function run(action: () => Promise<TxResult>) {
    tx.reset();
    setNotice("");
    if (await tx.run(action)) await refresh();
  }

  return (
    <PageShell title="Admin" subtitle="Manage provider approvals and review the funding policy.">
      {loadError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{loadError}</p>}

      <RoleGuard role="admin">
        <div className="space-y-4">
          <TxStatus busy={tx.busy} error={tx.error} txHash={tx.result?.txHash} />
          {notice && <p role="status" className="text-sm">{notice}</p>}
          <Card>
            <CardHeader><CardTitle>Add provider</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="provider-address">Provider address</Label>
                <Input id="provider-address" value={candidate} onChange={(e) => setCandidate(e.target.value)} />
              </div>
              <Button disabled={tx.busy} onClick={() => void run(async () => {
                if (!isValidAccount(candidate)) throw new LayaError(0, "That is not a valid Stellar address.");
                if (!await client.hasTrustline(candidate)) throw new LayaError(0, "Provider needs a test USDC trustline first.");
                const result = await client.addCreditor(candidate);
                setNotice(`Registered ${candidate}. The demo list below only enumerates configured providers.`);
                return result;
              })}>Add provider</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Demo timing</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="period">Period in seconds</Label>
                <Input id="period" className="w-28" type="number" value={period} onChange={(e) => setPeriod(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pause">Maximum missed periods</Label>
                <Input id="pause" className="w-28" type="number" value={pause} onChange={(e) => setPause(e.target.value)} />
              </div>
              <Button disabled={tx.busy} onClick={() => void run(async () => {
                if (!/^\d+$/.test(period.trim()) || !Number.isSafeInteger(Number(period)) || Number(period) <= 0) throw new LayaError(11, "Enter a period longer than zero seconds.");
                if (!/^\d+$/.test(pause.trim()) || !Number.isSafeInteger(Number(pause)) || Number(pause) > 4294967295) throw new LayaError(0, "Enter a whole number of missed periods, 0 or more.");
                return client.setPeriod({ periodSecs: Number(period), maxPausePeriods: Number(pause) });
              })}>Save timing</Button>
            </CardContent>
          </Card>
        </div>
      </RoleGuard>

      <Card>
        <CardHeader><CardTitle>Demo providers</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>This list contains the demo data; on-chain registration is checked for each address.</p>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Provider</TableHead><TableHead>Registration</TableHead><TableHead>On chain</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {providerData.map((p) => (
                <TableRow key={p.name}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.regNo}</TableCell>
                  <TableCell>{p.address ? (registered[p.address] === undefined ? "checking…" : registered[p.address] ? "registered" : "not registered") : "no payment address"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rulebook</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Price caps are illustrative demo values, not official caps.</p>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Bill</TableHead><TableHead>Payer</TableHead><TableHead>Cap</TableHead><TableHead>Rule</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {ruleData.map((r) => (
                <TableRow key={r.billType}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell>{r.payer}</TableCell>
                  <TableCell>{r.capUsd !== undefined ? `illustrative cap ${r.capUsd} USDC` : "—"}</TableCell>
                  <TableCell>{r.reason} <a className="underline" href={r.sourceUrl} target="_blank" rel="noreferrer">Source</a></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
