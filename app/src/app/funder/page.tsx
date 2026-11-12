"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AmountDisplay } from "@/components/AmountDisplay";
import { errorText } from "@/components/errors";
import { PageShell } from "@/components/PageShell";
import { RoleGuard } from "@/components/RoleGuard";
import { loanDisplayStatus, StatusBadge } from "@/components/StatusBadge";
import { TxStatus } from "@/components/TxStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTx } from "@/components/useTx";
import { useLaya } from "@/lib/hooks/useLaya";
import { useWallet } from "@/lib/hooks/useWallet";
import { LayaError } from "@/lib/types";
import type { Loan, PayoffRequest, TxResult } from "@/lib/types";
import config from "@/lib/config";
import people from "@/data/people.json";
import { classify, provider, Verify } from "@/data/ui";

type FunderRole = "funder" | "employer";

export default function FunderPage() {
  // Two roles share this page. Anything that is not the employer account is asked to switch to the funder account.
  const { role } = useWallet();
  const guard: FunderRole = role === "employer" ? "employer" : "funder";
  return (
    <PageShell title="Funding" subtitle={guard === "employer" ? "Review confirmed bills your organization can pay directly." : "Review confirmed invoices and track the bills you finance."} wide>
      <RoleGuard role={guard}>
        <Funding role={guard} />
      </RoleGuard>
    </PageShell>
  );
}

function Funding({ role }: { role: FunderRole }) {
  const client = useLaya();
  const { address } = useWallet();
  const [requests, setRequests] = useState<PayoffRequest[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [fee, setFee] = useState("3");
  const [tab, setTab] = useState("requests");
  const [maxPause, setMaxPause] = useState(3);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tx = useTx<TxResult>();

  const refresh = useCallback(async () => {
    try {
      const [r, l, cfg] = await Promise.all([client.listRequests(), client.listLoans(), client.getConfig()]);
      setRequests(r); setLoans(l); setMaxPause(cfg.maxPausePeriods); setLoadError(null);
    } catch (e) { setLoadError(errorText(e)); }
  }, [client]);
  useEffect(() => {
    void Promise.resolve().then(refresh);
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [refresh, address]);

  const feeParts = /^(\d+)(?:\.(\d{1,2}))?$/.exec(fee.trim());
  const feeBps = feeParts ? Number(feeParts[1]) * 100 + Number((feeParts[2] ?? "").padEnd(2, "0")) : NaN;

  async function fund(id: number) {
    tx.reset();
    const r = await tx.run(async () => {
      if (role === "funder" && (!Number.isSafeInteger(feeBps) || feeBps < 0 || feeBps > 800)) {
        throw new LayaError(0, "Enter a fee from 0 to 8%, with at most two decimal places.");
      }
      return client.fundRequest({ requestId: id, mode: role === "employer" ? "Grant" : "Loan", feeBps: role === "employer" ? 0 : feeBps });
    });
    if (r) await refresh();
  }

  const eligible = requests.filter((r) => r.status === "Confirmed" && ((role === "funder" && classify(r).payer === "worker") || (role === "employer" && classify(r).payer === "employer")));
  const mine = loans.filter((l) => l.funder === address);

  return (
    <div className="space-y-4">
      {loadError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{loadError}</p>}
      <TxStatus busy={tx.busy} error={tx.error} txHash={tx.result?.txHash} busyText="Submitting…" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Funding views" activateOnFocus>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="grid items-start gap-4 lg:grid-cols-2">
          {eligible.length === 0 && <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground lg:col-span-2">No confirmed requests for this account.</p>}
          {eligible.map((r) => {
            const c = classify(r);
            const p = provider(r.creditor);
            return (
              <Card key={r.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>#{r.id} · {c.rule?.label}</CardTitle>
                    <StatusBadge status={r.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="wrap-anywhere">Worker: {r.worker === config.accounts.worker ? people.worker.name : r.worker}</p>
                  <p>Provider: {p?.name} · {p?.regNo}</p>
                  <div>
                    <p>Amount:</p>
                    <AmountDisplay units={r.legalAmount} size="md" />
                  </div>
                  <p>Share: {r.shareBps / 100}%</p>
                  <p>{c.reason} {c.rule && <a className="underline" href={c.rule.sourceUrl} target="_blank" rel="noreferrer">Source</a>}</p>
                  <Verify hash={r.docHash} />
                  {role === "funder" ? (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor={`fee-${r.id}`}>Flat fee (%)</Label>
                        <Input id={`fee-${r.id}`} className="w-24" type="number" min="0" max="8" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
                      </div>
                      <p>Estimated repayment: {r.shareBps > 0 && Number.isSafeInteger(feeBps) && feeBps >= 0 && feeBps <= 800 ? ((r.legalAmount * BigInt(10000 + feeBps) / 10000n + (4000000000n * BigInt(r.shareBps) / 10000n) - 1n) / (4000000000n * BigInt(r.shareBps) / 10000n)).toString() : "—"} remittances of 400 USDC, assuming the same share each time.</p>
                    </>
                  ) : (
                    <p>Grant · fee 0 · worker owes 0</p>
                  )}
                  <Button disabled={tx.busy} onClick={() => void fund(r.id)}>
                    {tx.busy ? "Submitting…" : role === "employer" ? "Pay as employer" : "Fund loan"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="portfolio" className="grid items-start gap-4 lg:grid-cols-2">
          {mine.map((l) => {
            // Same wording as before: "Overdue" carries no "n missed" detail.
            const s = loanDisplayStatus(l, maxPause);
            return (
              <Card key={l.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>Loan #{l.id}</CardTitle>
                    {l.mode === "Grant"
                      ? <span className="text-sm">Paid by employer · worker owes 0</span>
                      : <StatusBadge status={s.status} detail={s.status === "Overdue" ? undefined : s.detail} />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div><p>Outstanding</p><AmountDisplay units={l.outstanding} size="sm" showPhp={false} /></div>
                    {l.mode !== "Grant" && <div><p>Repaid</p><AmountDisplay units={l.totalRepaid} size="sm" showPhp={false} /></div>}
                  </div>
                  <p>Remittances: {l.remitCount}</p>
                  <Link className="underline" href={`/proof/${l.id}`}>View receipt</Link>
                </CardContent>
              </Card>
            );
          })}
          {mine.length === 0 && <p className="text-sm text-muted-foreground">No funded loans.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
