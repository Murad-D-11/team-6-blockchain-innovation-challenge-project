"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AmountDisplay } from "@/components/AmountDisplay";
import { firstName, payerName, PEOPLE, PROVIDERS, providerName, RULES } from "@/components/demoData";
import { errorText } from "@/components/errors";
import { usePoll } from "@/components/hooks";
import { PageShell } from "@/components/PageShell";
import { RoleGuard } from "@/components/RoleGuard";
import { LoanStatusBadge, StatusBadge } from "@/components/StatusBadge";
import { TxStatus } from "@/components/TxStatus";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Slider } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTx } from "@/components/useTx";
import config from "@/lib/config";
import { MAX_SHARE_BPS, split } from "@/lib/formulas";
import { useLaya } from "@/lib/hooks/useLaya";
import { useWallet } from "@/lib/hooks/useWallet";
import { classifyRequest } from "@/lib/rulebook";
import type { Loan, PayoffRequest, RemitResult, TxResult } from "@/lib/types";
import { formatUsd, fromUnits, toUnits } from "@/lib/units";

const FAMILY = firstName(PEOPLE.family.name);

export default function WorkerDashboardPage() {
  const sub = [PEOPLE.worker.name, PEOPLE.worker.job, PEOPLE.worker.country].filter(Boolean).join(" · ");
  return (
    <PageShell title="My Laya" subtitle={sub}>
      <RoleGuard role="worker">
        <Dashboard />
      </RoleGuard>
    </PageShell>
  );
}

/** What the bill was, from the rulebook (bill type is not stored on-chain). */
function billLabel(r: { creditor: string; legalAmount: bigint }): string {
  return classifyRequest(r, PROVIDERS, RULES).rule?.label ?? "Bill";
}

function Dashboard() {
  const laya = useLaya();
  const { address } = useWallet();
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [requests, setRequests] = useState<PayoffRequest[]>([]);
  const [maxPause, setMaxPause] = useState(config.maxPausePeriods);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    try {
      const [allLoans, allReqs, cfg, bal] = await Promise.all([
        laya.listLoans(), laya.listRequests(), laya.getConfig(), laya.getBalance(address),
      ]);
      setLoans(allLoans.filter((l) => l.worker === address));
      setRequests(allReqs.filter((r) => r.worker === address));
      setMaxPause(cfg.maxPausePeriods);
      setBalance(bal);
      setError(null);
    } catch (e) {
      setError(errorText(e));
    }
  }, [laya, address]);
  usePoll(load); // the pause clock moves with real time (one demo "month" is 60 seconds)

  if (error && !loans) return <p className="text-sm text-red-700">{error}</p>;
  if (!loans) return <p className="text-sm text-muted-foreground">Loading…</p>;

  // Requests that are not loans yet (Open or Confirmed). Funded ones show as loans below.
  const waiting = requests.filter((r) => r.status === "Open" || r.status === "Confirmed");
  const sorted = [...loans].sort((a, b) => a.id - b.id);

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-700">{error}</p>}
      {balance !== null && (
        <p className="text-sm text-muted-foreground">
          Wallet balance: <span className="font-semibold text-foreground">{formatUsd(balance)}</span> test USDC
        </p>
      )}

      {loans.length > 0 ? (
        <SendHome loans={sorted} onDone={load} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No paid bills yet</CardTitle>
            <CardDescription>
              When a provider confirms a bill and the employer or a funder pays it, it shows up here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/worker/request" className={buttonVariants()}>List your bills</Link>
          </CardContent>
        </Card>
      )}

      {sorted.map((l) => <LoanCard key={l.id} loan={l} maxPause={maxPause} onChanged={load} />)}

      <WithoutWithLaya />

      {waiting.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Waiting</CardTitle>
            <CardDescription>Bills not paid yet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {waiting.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span>#{r.id} · {billLabel(r)} · {fromUnits(r.legalAmount)} USDC</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Link href="/worker/request" className="block text-center text-sm text-blue-600 underline">List more bills or cancel a request</Link>
    </div>
  );
}

function SendHome({ loans, onDone }: { loans: Loan[]; onDone: () => void }) {
  const laya = useLaya();
  // Default: the newest Active loan. `loans` is sorted oldest first, so search from the end.
  // If none is Active, the newest loan (a Grant or repaid loan sends everything to family).
  const defaultId = ([...loans].reverse().find((l) => l.status === "Active") ?? loans[loans.length - 1]).id;
  const [loanId, setLoanId] = useState(defaultId);
  const [amount, setAmount] = useState("400");
  const tx = useTx<RemitResult>();
  const [sent, setSent] = useState<{ result: RemitResult; before: bigint } | null>(null);

  const loan = loans.find((l) => l.id === loanId) ?? loans[0];
  let units: bigint | null = null;
  try {
    units = toUnits(amount.trim());
    if (units <= 0n) units = null;
  } catch {
    units = null;
  }
  const preview = units !== null ? split(units, loan.shareBps, loan.outstanding) : null;
  const repaying = loan.status === "Active" && loan.outstanding > 0n;

  async function send() {
    if (units === null) return;
    const before = loan.outstanding;
    const amt = units;
    setSent(null);
    const r = await tx.run(() => laya.remit({ loanId: loan.id, amount: amt }));
    if (r) {
      setSent({ result: r, before });
      onDone();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send money home</CardTitle>
        <CardDescription>
          {repaying
            ? `One transaction: ${loan.shareBps / 100}% repays ${PEOPLE.funder.name}, the rest goes to ${FAMILY}.`
            : `Nothing is owed on this bill, so everything goes to ${FAMILY}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loans.length > 1 && (
          <div className="space-y-1.5">
            <Label htmlFor="loan">Repay which bill</Label>
            <Select id="loan" value={loanId} onChange={(e) => { setLoanId(Number(e.target.value)); tx.reset(); setSent(null); }}>
              {loans.map((l) => (
                <option key={l.id} value={l.id}>
                  #{l.id} · {billLabel(l)} · {l.mode === "Grant" ? "paid by employer" : l.status === "Repaid" ? "repaid" : `owes ${fromUnits(l.outstanding)}`}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="amt">Amount (USD)</Label>
          <Input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        {preview && (
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">To the funder</div>
              <div className="font-semibold tabular-nums">{fromUnits(preview.toLender)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">To {FAMILY}</div>
              <div className="font-semibold tabular-nums">{fromUnits(preview.toFamily)}</div>
            </div>
            {repaying && (
              <div className="col-span-2 text-xs text-muted-foreground">
                Still owed after: {fromUnits(loan.outstanding)} → {fromUnits(preview.outstanding)}
              </div>
            )}
          </div>
        )}

        <Button size="lg" className="w-full" onClick={send} disabled={tx.busy || units === null}>
          {tx.busy ? "Sending…" : units !== null ? `Send ${fromUnits(units)} home` : "Enter an amount"}
        </Button>
        <TxStatus busy={tx.busy} error={tx.error} busyText="Waiting for signature and network…" />

        {sent && !tx.busy && !tx.error && (
          <div className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm" role="status">
            <p className="font-semibold">Sent ✓</p>
            <p>{fromUnits(sent.result.toLender)} to the funder, {fromUnits(sent.result.toFamily)} to {FAMILY}</p>
            <p className="text-muted-foreground">
              Still owed: {fromUnits(sent.before)} → <span className="font-semibold text-foreground">{fromUnits(sent.result.outstanding)}</span>
            </p>
            <TxStatus busy={false} error={null} txHash={sent.result.txHash} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoanCard({ loan, maxPause, onChanged }: { loan: Loan; maxPause: number; onChanged: () => void }) {
  const title = `#${loan.id} · ${billLabel(loan)}`;
  const provider = providerName(loan.creditor);

  if (loan.mode === "Grant") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{title}</CardTitle>
            <StatusBadge status="Repaid" />
          </div>
          <CardDescription>{payerName("Grant")} paid {provider} {fromUnits(loan.legalAmount)} USDC directly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 font-semibold text-emerald-900">Paid by employer: you owe 0</p>
          <Link href={`/proof/${loan.id}`} className="text-sm text-blue-600 underline">Public receipt</Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          <LoanStatusBadge loan={loan} maxPausePeriods={maxPause} />
        </div>
        <CardDescription>
          {payerName("Loan")} paid {provider} {fromUnits(loan.legalAmount)} USDC directly. Flat fee {loan.feeBps / 100}%.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-xs text-muted-foreground">Still owed</div>
          <AmountDisplay units={loan.outstanding} size="lg" />
        </div>
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div><dt className="text-xs text-muted-foreground">Repaid</dt><dd className="font-semibold tabular-nums">{fromUnits(loan.totalRepaid)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Sent to {FAMILY}</dt><dd className="font-semibold tabular-nums">{fromUnits(loan.totalToFamily)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Remittances</dt><dd className="font-semibold tabular-nums">{loan.remitCount}</dd></div>
        </dl>

        {loan.status === "Active" && loan.missedPeriods > 0 && !loan.isOverdue && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
            Paused: no money sent for {loan.missedPeriods} of {maxPause} periods. Nothing added, balance unchanged.
          </p>
        )}
        {loan.isOverdue && (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
            Overdue: more than {maxPause} periods without a payment. The funder will follow up. Nothing was added to your balance.
          </p>
        )}

        {loan.status === "Active" && <ShareControl key={loan.shareBps} loan={loan} onChanged={onChanged} />}

        <Link href={`/proof/${loan.id}`} className="text-sm text-blue-600 underline">Public receipt</Link>
      </CardContent>
    </Card>
  );
}

function ShareControl({ loan, onChanged }: { loan: Loan; onChanged: () => void }) {
  const laya = useLaya();
  const [bps, setBps] = useState(loan.shareBps);
  const tx = useTx<TxResult>();
  const atMax = loan.minShareBps >= MAX_SHARE_BPS;

  async function save() {
    const r = await tx.run(() => laya.setShare({ loanId: loan.id, shareBps: bps }));
    if (r) onChanged();
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-border p-3">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={`share-${loan.id}`}>Repayment share</Label>
        <span className="font-semibold tabular-nums">{bps / 100}%</span>
      </div>
      {!atMax && (
        <Slider id={`share-${loan.id}`} min={loan.minShareBps} max={MAX_SHARE_BPS} step={100} value={bps}
          disabled={tx.busy} onChange={(e) => setBps(Number(e.target.value))} />
      )}
      <p className="text-xs text-muted-foreground">
        {atMax ? "Already at the 15% maximum." : `Can go up to 15%, never below the ${loan.minShareBps / 100}% you agreed to.`}
      </p>
      {bps !== loan.shareBps && (
        <Button size="sm" onClick={save} disabled={tx.busy}>{tx.busy ? "Saving…" : `Set share to ${bps / 100}%`}</Button>
      )}
      <TxStatus busy={tx.busy} error={tx.error} txHash={tx.result?.txHash} busyText="Saving…" />
    </div>
  );
}

/**
 * Static comparison for the pitch (demo step 8). Illustrative numbers from PLAN-v2, no inputs, nothing stored.
 * Without Laya: 190 + 65 + 1,380 = 1,635 USDC borrowed at 54% a year → 1,635 × 0.54 / 12 ≈ 74 USDC interest a month.
 * With Laya: placement fee refused, medical exam paid by the employer, training 190 + 3% fee = 195.70 owed.
 */
function WithoutWithLaya() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Without Laya vs with Laya</CardTitle>
          <span className="text-xs text-muted-foreground">illustrative</span>
        </div>
        <CardDescription>Maria&apos;s three bills: training 190, medical exam 65, placement fee 1,380.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">Without Laya</p>
          <p className="text-2xl font-bold tabular-nums">1,635 USDC</p>
          <p>She borrows the whole amount, including the illegal placement fee.</p>
          <p>At 54% a year, the interest alone is about <span className="font-semibold">74 USDC a month</span>, even in months she earns nothing.</p>
        </div>
        <div className="space-y-1 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="font-semibold">With Laya</p>
          <p className="text-2xl font-bold tabular-nums">195.70 USDC</p>
          <p>The placement fee is refused. The employer pays the medical exam.</p>
          <p>She owes only the training plus a 3% fee, repaid from what she sends home, and <span className="font-semibold">paused when she sends nothing</span>.</p>
        </div>
      </CardContent>
    </Card>
  );
}
