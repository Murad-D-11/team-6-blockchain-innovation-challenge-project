"use client";

import { useCallback, useState } from "react";
import { AmountDisplay } from "@/components/AmountDisplay";
import { firstName, PEOPLE } from "@/components/demoData";
import { errorText } from "@/components/errors";
import { usePoll } from "@/components/hooks";
import { PageShell } from "@/components/PageShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLaya } from "@/lib/hooks/useLaya";
import { useWallet } from "@/lib/hooks/useWallet";

const WORKER = firstName(PEOPLE.worker.name);

export default function FamilyPage() {
  const sub = [PEOPLE.family.relation, PEOPLE.family.city].filter(Boolean).join(" · ");
  return (
    <PageShell title={`Hi ${firstName(PEOPLE.family.name)}`} subtitle={sub}>
      <RoleGuard role="family">
        <FamilyView />
      </RoleGuard>
    </PageShell>
  );
}

function FamilyView() {
  const laya = useLaya();
  const { address } = useWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [received, setReceived] = useState<bigint | null>(null);
  const [remits, setRemits] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    try {
      const [bal, loans] = await Promise.all([laya.getBalance(address), laya.listLoans()]);
      const mine = loans.filter((l) => l.family === address);
      setBalance(bal);
      setReceived(mine.reduce((sum, l) => sum + l.totalToFamily, 0n));
      setRemits(mine.reduce((n, l) => n + l.remitCount, 0));
      setError(null);
    } catch (e) {
      setError(errorText(e));
    }
  }, [laya, address]);
  usePoll(load); // refreshes every 5 seconds, so Maria's remittance shows up without reloading

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">{error}</p>}

      <Card>
        <CardHeader>
          <CardDescription>Your balance</CardDescription>
        </CardHeader>
        <CardContent>
          {balance === null ? <p className="text-sm text-muted-foreground">Loading…</p> : <AmountDisplay units={balance} size="lg" />}
          <p className="mt-1 text-xs text-muted-foreground">Updates every few seconds.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Total received from {WORKER} through Laya</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {received === null ? <p className="text-sm text-muted-foreground">Loading…</p> : <AmountDisplay units={received} size="lg" />}
          <p className="text-xs text-muted-foreground">{remits} {remits === 1 ? "remittance" : "remittances"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How this works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Some of {WORKER}&apos;s job bills were paid directly to the providers: her employer paid one, and a fair funder paid
            the other. When she sends money home, a small share she chose repays the funder and the rest arrives here, in the
            same transaction.
          </p>
          <p>If she can&apos;t send money one month, repayment simply pauses. Nothing extra is added.</p>
          <p className="text-muted-foreground">You don&apos;t need to sign anything. This page only shows your balance.</p>
        </CardContent>
      </Card>
    </div>
  );
}
