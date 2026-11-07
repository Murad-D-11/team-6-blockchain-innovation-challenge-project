"use client";
import { useCallback, useEffect, useState } from "react";
import { AmountDisplay } from "@/components/AmountDisplay";
import { errorText } from "@/components/errors";
import { PageShell } from "@/components/PageShell";
import { RoleGuard } from "@/components/RoleGuard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TxStatus } from "@/components/TxStatus";
import { useTx } from "@/components/useTx";
import { useLaya } from "@/lib/hooks/useLaya";
import { useWallet } from "@/lib/hooks/useWallet";
import type { PayoffRequest, TxResult } from "@/lib/types";
import { classify } from "@/data/ui";

export default function ProviderPage() {
  return (
    <PageShell title="Provider">
      <RoleGuard role="creditor">
        <OpenRequests />
      </RoleGuard>
    </PageShell>
  );
}

function OpenRequests() {
  const client = useLaya();
  const { address } = useWallet();
  const [requests, setRequests] = useState<PayoffRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tx = useTx<TxResult>();

  const refresh = useCallback(async () => {
    try { setRequests(await client.listRequests()); setLoadError(null); } catch (e) { setLoadError(errorText(e)); }
  }, [client]);
  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh, address]);

  async function confirm(id: number) {
    tx.reset();
    if (await tx.run(() => client.confirmRequest(id))) await refresh();
  }

  const open = requests.filter((r) => r.creditor === address && r.status === "Open");
  return (
    <div className="space-y-4">
      {loadError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{loadError}</p>}
      <TxStatus busy={tx.busy} error={tx.error} txHash={tx.result?.txHash} busyText="Confirming…" />
      {open.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle>Request #{r.id}: {classify(r).rule?.label ?? "Unknown bill"}</CardTitle>
              <StatusBadge status={r.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm">Invoice amount:</p>
              <AmountDisplay units={r.legalAmount} size="md" />
            </div>
            <p className="text-sm">By confirming, you state that the invoice amount is exactly this.</p>
            <Button disabled={tx.busy} onClick={() => void confirm(r.id)}>{tx.busy ? "Confirming…" : "Confirm invoice"}</Button>
          </CardContent>
        </Card>
      ))}
      {open.length === 0 && <p className="text-sm text-muted-foreground">No open requests for this provider.</p>}
    </div>
  );
}
