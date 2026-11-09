"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { usePoll } from "@/components/hooks";
import { PageShell } from "@/components/PageShell";
import { PROVIDERS, providerName, RULES, SAMPLE_INVOICES } from "@/components/demoData";
import { RoleGuard } from "@/components/RoleGuard";
import { StatusBadge } from "@/components/StatusBadge";
import { TxLink } from "@/components/TxLink";
import { TxStatus } from "@/components/TxStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Slider } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorText } from "@/components/errors";
import { isValidAccount, shortAddress } from "@/lib/address";
import config from "@/lib/config";
import { MAX_SHARE_BPS, MIN_SHARE_BPS } from "@/lib/formulas";
import { hashFile } from "@/lib/hash";
import { useLaya } from "@/lib/hooks/useLaya";
import { useWallet } from "@/lib/hooks/useWallet";
import { classifyBill, classifyRequest, type BillType, type Classification } from "@/lib/rulebook";
import type { PayoffRequest } from "@/lib/types";
import { formatPhp, fromUnits, toUnits } from "@/lib/units";

const MONTHS = 12; // v2: months no longer changes any amount; fixed and not shown

const BILL_TYPES: { value: BillType; label: string }[] = [
  { value: "training", label: "Training" },
  { value: "medical_exam", label: "Medical exam" },
  { value: "placement_fee", label: "Placement fee" },
  { value: "other", label: "Other" },
];

interface Row {
  key: number;
  billType: BillType;
  providerIdx: number; // index into PROVIDERS
  amount: string;
  docHash: string | null;
  hashing: boolean;
  sent: { requestId: number; txHash: string } | null;
}

/** Default rows follow the demo: training, medical exam, placement fee. Amounts and files are entered live. */
function defaultRows(): Row[] {
  const idx = (kind: string) => Math.max(0, PROVIDERS.findIndex((p) => p.kind === kind));
  return [
    { key: 1, billType: "training", providerIdx: idx("training_center"), amount: "", docHash: null, hashing: false, sent: null },
    { key: 2, billType: "medical_exam", providerIdx: idx("clinic"), amount: "", docHash: null, hashing: false, sent: null },
    { key: 3, billType: "placement_fee", providerIdx: idx("agency"), amount: "", docHash: null, hashing: false, sent: null },
  ];
}

function parseAmount(s: string): bigint | null {
  try {
    const u = toUnits(s.trim());
    return u > 0n ? u : null;
  } catch {
    return null;
  }
}

/** Classify a row. Uses the amount when valid; with no amount yet, classify as 0 so the rule shows right away. */
function classify(row: Row): Classification {
  const p = PROVIDERS[row.providerIdx];
  return classifyBill(
    { billType: row.billType, providerKind: p.kind, verified: p.verified, amount: parseAmount(row.amount) ?? 0n },
    RULES,
  );
}

export default function WorkerRequestPage() {
  return (
    <PageShell title="List your bills" subtitle="Laya checks each bill against a published rulebook and sends it to whoever legally owes it.">
      <RoleGuard role="worker">
        <BillsForm />
      </RoleGuard>
    </PageShell>
  );
}

function BillsForm() {
  const laya = useLaya();
  const { address } = useWallet();
  const [rows, setRows] = useState<Row[]>(defaultRows);
  const [nextKey, setNextKey] = useState(4);
  const [shareBps, setShareBps] = useState(MAX_SHARE_BPS);
  const [family, setFamily] = useState(config.accounts.family);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [requests, setRequests] = useState<PayoffRequest[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const all = await laya.listRequests();
      setRequests(all.filter((r) => r.worker === address));
      setListError(null);
    } catch (e) {
      setListError(errorText(e));
    }
  }, [laya, address]);
  usePoll(loadRequests); // picks up the provider's confirmation and funding from other tabs

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function onFile(key: number, f: File | undefined) {
    update(key, { docHash: null, hashing: !!f });
    if (!f) return;
    const h = await hashFile(f); // the file stays in the browser; only the fingerprint is used
    update(key, { docHash: h, hashing: false });
  }

  function addRow() {
    setRows((rs) => [...rs, { key: nextKey, billType: "other", providerIdx: 0, amount: "", docHash: null, hashing: false, sent: null }]);
    setNextKey((k) => k + 1);
  }

  const familyOk = isValidAccount(family.trim());
  const pending = rows.filter((r) => !r.sent);
  // Rows that will become requests: accepted by the rulebook, with an amount, a file and an on-chain provider address.
  const ready = pending.filter((r) => {
    const c = classify(r);
    return !c.blocksRequest && parseAmount(r.amount) !== null && r.docHash !== null && PROVIDERS[r.providerIdx].address !== null;
  });
  const acceptedButIncomplete = pending.filter((r) => !classify(r).blocksRequest && !ready.includes(r));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setSubmitError(null);
    if (!familyOk || ready.length === 0 || acceptedButIncomplete.length > 0) return;
    setBusy(true);
    try {
      // One request per accepted bill, in list order (training first, so it is request 1 in the demo).
      for (const r of ready) {
        const res = await laya.requestPayoff({
          family: family.trim(),
          creditor: PROVIDERS[r.providerIdx].address!,
          principal: parseAmount(r.amount)!,
          months: MONTHS,
          shareBps,
          docHash: r.docHash!,
        });
        update(r.key, { sent: { requestId: res.requestId, txHash: res.txHash } });
      }
    } catch (err) {
      setSubmitError(errorText(err)); // rows already sent stay marked as sent, so a retry only sends the rest
    } finally {
      setBusy(false);
      void loadRequests();
    }
  }

  async function onCancel(id: number) {
    setCancelBusy(id);
    setCancelError(null);
    try {
      await laya.cancelRequest(id);
      void loadRequests();
    } catch (e) {
      setCancelError(errorText(e));
    } finally {
      setCancelBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        {rows.map((r, i) => (
          <BillRow key={r.key} row={r} index={i} touched={touched}
            onChange={(patch) => update(r.key, patch)} onFile={(f) => onFile(r.key, f)}
            onRemove={rows.length > 1 && !r.sent ? () => setRows((rs) => rs.filter((x) => x.key !== r.key)) : undefined} />
        ))}
        <Button type="button" variant="outline" className="w-full" onClick={addRow}>+ Add another bill</Button>

        <Card>
          <CardHeader>
            <CardTitle>How you repay what you owe</CardTitle>
            <CardDescription>A share of each remittance you send through Laya. If you send nothing, nothing is taken and nothing is added.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="share">Share of each remittance</Label>
                <span className="text-lg font-semibold tabular-nums">{shareBps / 100}%</span>
              </div>
              <Slider id="share" min={MIN_SHARE_BPS} max={MAX_SHARE_BPS} step={100} value={shareBps}
                onChange={(e) => setShareBps(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">
                Send 400 home → {fromUnits((toUnits("400") * BigInt(shareBps)) / 10000n)} repays, the rest goes to your family. You can raise it later, never lower it.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="family">Family wallet</Label>
              <Input id="family" className="font-mono text-sm" value={family} spellCheck={false}
                aria-invalid={touched && !familyOk} onChange={(e) => setFamily(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                {family.trim() === config.accounts.family ? "Lorna Santos (mother) · demo account" : familyOk ? "Valid address" : "Not a valid Stellar address"}
              </p>
            </div>
          </CardContent>
        </Card>

        {touched && ready.length > 0 && (acceptedButIncomplete.length > 0 || !familyOk) && (
          <ul className="list-inside list-disc rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {acceptedButIncomplete.length > 0 && <li>Add the amount and invoice file for every accepted bill</li>}
            {!familyOk && <li>Enter a valid family wallet address</li>}
          </ul>
        )}

        <p className="text-sm font-medium">Your signature is your consent to this request.</p>
        <Button type="submit" size="lg" className="w-full" disabled={busy || ready.length === 0 || rows.some((r) => r.hashing)}>
          {busy ? "Signing…" : ready.length > 0
            ? `Sign and send ${ready.length} ${ready.length === 1 ? "request" : "requests"}`
            : "Sign and send"}
        </Button>
        {!busy && ready.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {pending.some((r) => !classify(r).blocksRequest)
              ? "Add the amount and invoice file for an accepted bill to continue."
              : "There are no accepted bills to send."}
          </p>
        )}
        {busy && <p className="text-sm text-muted-foreground" role="status">Waiting for signature and network… (one signature per bill)</p>}
        {submitError && <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">{submitError}</p>}
      </form>

      <Card>
        <CardHeader>
          <CardTitle>My requests</CardTitle>
          <CardDescription>Updates every few seconds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {listError && <p className="text-sm text-red-700">{listError}</p>}
          {requests.length === 0 && !listError && <p className="text-sm text-muted-foreground">No requests yet.</p>}
          {requests.map((r) => {
            const c = classifyRequest(r, PROVIDERS, RULES);
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">#{r.id}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm">
                    {c.rule?.label ?? "Bill"} · {providerName(r.creditor)} · {fromUnits(r.legalAmount)} USDC
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.payer === "employer" ? "Employer pays · you owe 0" : c.payer === "worker" ? "You pay through a fair loan" : "Needs review"}
                    {" · "}
                    {r.status === "Open" && "waiting for the provider to confirm the amount"}
                    {r.status === "Confirmed" && `provider confirmed · waiting for the ${c.payer === "employer" ? "employer" : "funder"}`}
                    {r.status === "Funded" && "provider paid in full"}
                    {r.status === "Cancelled" && "cancelled"}
                    {r.family !== config.accounts.family && ` · family ${shortAddress(r.family)}`}
                  </p>
                </div>
                <div className="flex gap-3">
                  {(r.status === "Open" || r.status === "Confirmed") && (
                    <Button variant="outline" size="sm" disabled={cancelBusy !== null} onClick={() => onCancel(r.id)}>
                      {cancelBusy === r.id ? "Cancelling…" : "Cancel"}
                    </Button>
                  )}
                  {r.status === "Funded" && (
                    <>
                      <Link href="/worker" className="text-sm text-blue-600 underline">Dashboard</Link>
                      <Link href={`/proof/${r.id}`} className="text-sm text-blue-600 underline">Receipt</Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <TxStatus busy={false} error={cancelError} />
        </CardContent>
      </Card>
    </div>
  );
}

function BillRow({ row, index, touched, onChange, onFile, onRemove }: {
  row: Row; index: number; touched: boolean;
  onChange: (patch: Partial<Row>) => void; onFile: (f: File | undefined) => void; onRemove?: () => void;
}) {
  const c = classify(row);
  const amount = parseAmount(row.amount);
  const provider = PROVIDERS[row.providerIdx];
  const id = `bill-${row.key}`;

  return (
    <Card className={c.payer === "prohibited" ? "border-red-300" : undefined}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Bill {index + 1}</CardTitle>
        {onRemove && <Button type="button" variant="ghost" size="sm" onClick={onRemove}>Remove</Button>}
      </CardHeader>
      <CardContent className="space-y-3">
        {row.sent ? (
          <div className="space-y-1 text-sm">
            <p>{c.rule?.label ?? "Bill"} · {provider.name} · {row.amount} USDC</p>
            <p className="font-medium text-emerald-800">Sent as request #{row.sent.requestId}</p>
            <TxLink hash={row.sent.txHash} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-type`}>Bill type</Label>
                <Select id={`${id}-type`} value={row.billType} onChange={(e) => onChange({ billType: e.target.value as BillType })}>
                  {BILL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-amt`}>Amount (USD)</Label>
                <Input id={`${id}-amt`} inputMode="decimal" placeholder="0.00" value={row.amount}
                  aria-invalid={touched && !c.blocksRequest && amount === null}
                  onChange={(e) => onChange({ amount: e.target.value })} />
                <p className="h-4 text-xs text-muted-foreground">{amount !== null ? `≈ ${formatPhp(amount)} (illustrative rate)` : " "}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-prov`}>Provider</Label>
              <Select id={`${id}-prov`} value={row.providerIdx} onChange={(e) => onChange({ providerIdx: Number(e.target.value) })}>
                {PROVIDERS.map((p, i) => (
                  <option key={p.name} value={i}>{p.name} · {p.regNo}{p.verified ? "" : " · not verified"}</option>
                ))}
              </Select>
            </div>
            {!c.blocksRequest && (
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-doc`}>Invoice file</Label>
                <Input id={`${id}-doc`} type="file" accept="application/pdf,image/*" className="h-auto py-2 text-sm"
                  aria-invalid={touched && row.docHash === null} onChange={(e) => onFile(e.target.files?.[0])} />
                <p className="text-xs text-muted-foreground">
                  {row.hashing ? "Making fingerprint…" : row.docHash
                    ? <>Fingerprint <span className="font-mono">{row.docHash.slice(0, 12)}…</span> · the file never leaves your phone</>
                    : "Only a fingerprint (SHA-256) is stored. The file never leaves your phone."}
                </p>
                {!row.docHash && SAMPLE_INVOICES[row.billType] && (
                  <a href={SAMPLE_INVOICES[row.billType]} download className="text-xs text-blue-600 underline">
                    Download the fictional sample invoice
                  </a>
                )}
              </div>
            )}
          </>
        )}
        <Verdict c={c} />
      </CardContent>
    </Card>
  );
}

/** The rulebook result for one bill: who owes it, why, and the source. */
function Verdict({ c }: { c: Classification }) {
  const style = {
    employer: "border-emerald-200 bg-emerald-50 text-emerald-900",
    worker: "border-blue-200 bg-blue-50 text-blue-900",
    prohibited: "border-red-300 bg-red-50 text-red-900",
    needs_review: "border-amber-200 bg-amber-50 text-amber-900",
  }[c.payer];
  const headline = {
    employer: "Employer-owed: the employer pays the provider directly. You owe 0.",
    worker: "Worker-payable: a funder pays the provider directly, and you repay through a fair loan.",
    prohibited: `Refused: ${lowerFirst(firstSentence(c.reason))}`,
    needs_review: "Sent to review: not sent as a request.",
  }[c.payer];

  return (
    <div className={`space-y-1 rounded-md border p-3 text-sm ${style}`} role={c.payer === "prohibited" ? "alert" : undefined}>
      <p className="font-semibold">{headline}</p>
      <p>{c.payer === "prohibited" ? restAfterFirstSentence(c.reason) || "This bill will not be sent." : c.reason}</p>
      {c.rule && (
        <a href={c.rule.sourceUrl} target="_blank" rel="noreferrer" className="inline-block underline underline-offset-2">
          Source: {c.rule.sourceLabel}
        </a>
      )}
      {c.rule?.capUsd !== undefined && c.payer !== "prohibited" && (
        <p className="text-xs opacity-80">Illustrative demo cap: {c.rule.capUsd} USDC (not an official price cap).</p>
      )}
    </div>
  );
}

function firstSentence(t: string): string {
  const i = t.indexOf(". ");
  return i === -1 ? t : t.slice(0, i + 1);
}
function restAfterFirstSentence(t: string): string {
  const i = t.indexOf(". ");
  return i === -1 ? "" : t.slice(i + 2);
}
function lowerFirst(t: string): string {
  return t.charAt(0).toLowerCase() + t.slice(1);
}
