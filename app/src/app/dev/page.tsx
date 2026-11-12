"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import config from "@/lib/config";
import { MockLayaClient } from "@/lib/client/mock";
import { useLaya } from "@/lib/hooks/useLaya";
import { useWallet } from "@/lib/hooks/useWallet";
import { LayaError } from "@/lib/types";
import { fromUnits, toUnits } from "@/lib/units";
import type { AccountRole } from "@/lib/roles";

const HASH = "ab".repeat(32);
const ROLES = ["worker", "family", "funder", "creditor", "clinic", "employer", "admin"] as const;

function show(v: unknown): string {
  return JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? `${x.toString()} (${fromUnits(x, 7)} USDC)` : x), 2);
}

export default function DevPage() {
  const laya = useLaya();
  const { role } = useWallet();
  const [log, setLog] = useState<string[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [training, setTraining] = useState<number | null>(null); // request id = loan id
  const [medical, setMedical] = useState<number | null>(null);
  const [owed, setOwed] = useState<Record<string, string>>({});
  const mock = laya instanceof MockLayaClient ? laya : null;

  const refresh = useCallback(async () => {
    try {
      const out: Record<string, string> = {};
      for (const r of ROLES) out[r] = fromUnits(await laya.getBalance(config.accounts[r]));
      setBalances(out);
      // Owed by the worker: the invoice amount before funding, the loan's outstanding after.
      const o: Record<string, string> = {};
      for (const [name, id] of [["training", training], ["medical", medical]] as const) {
        if (id === null) continue;
        try {
          o[name] = fromUnits((await laya.getLoan(id)).outstanding);
        } catch {
          o[name] = fromUnits((await laya.getRequest(id)).legalAmount);
        }
      }
      setOwed(o);
    } catch {
      /* real client not ready */
    }
  }, [laya, training, medical]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function step(label: string, as: AccountRole | null, fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      if (as) mock?.setRole(as);
      const res = await fn();
      setLog((l) => [`OK  ${label}${as ? ` (as ${as})` : ""}\n${show(res)}`, ...l]);
    } catch (e) {
      const code = e instanceof LayaError ? e.code : "?";
      setLog((l) => [`ERR ${label}: [${code}] ${(e as Error).message}`, ...l]);
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  const request = (label: string, principal: string, provider: string, done: (id: number) => void) =>
    step(`request ${label}: ${principal} USDC / 12 months / 15%`, "worker", async () => {
      const r = await laya.requestPayoff({
        family: config.accounts.family,
        creditor: provider,
        principal: toUnits(principal),
        months: 12,
        shareBps: 1500,
        docHash: HASH,
      });
      done(r.requestId);
      return { ...r, request: await laya.getRequest(r.requestId) };
    });

  const confirm = (id: number, as: AccountRole) =>
    step(`confirm request ${id}`, as, () => laya.confirmRequest(id));

  const fund = (id: number, as: AccountRole, mode: "Loan" | "Grant", feeBps: number) =>
    step(`fund request ${id} as ${mode}${mode === "Loan" ? ` ${feeBps} bps` : ""}`, as, async () => {
      const r = await laya.fundRequest({ requestId: id, mode, feeBps });
      return { ...r, loan: await laya.getLoan(r.loanId) };
    });

  const btn = "min-h-10 rounded-md border border-input bg-card px-3 py-2 text-left hover:bg-secondary disabled:opacity-40";

  return (
    <PageShell title="Demo runner" subtitle="Run the training loan, medical grant, and remittance with mock accounts." publicView>
      <div className="space-y-5 text-sm">
      {!mock && <p className="text-red-600">Not running on the mock (NEXT_PUBLIC_USE_MOCK is not &quot;true&quot;).</p>}
      <p>
        Acting as: <b>{role}</b> · training request/loan: {training ?? "none"} · medical request/loan: {medical ?? "none"}
      </p>
      <p>
        Worker owes: training <b>{owed.training ?? "-"}</b> USDC · medical <b>{owed.medical ?? "-"}</b> USDC
      </p>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold">Training bill · 190 USDC loan at 3%</h2>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} className={btn} onClick={() => request("training", "190", config.accounts.creditor, setTraining)}>
            1. Request 190 (worker, provider = creditor)
          </button>
          <button disabled={busy || training === null} className={btn} onClick={() => confirm(training!, "creditor")}>
            2. Confirm (creditor)
          </button>
          <button disabled={busy || training === null} className={btn} onClick={() => fund(training!, "funder", "Loan", 300)}>
            3. Fund Loan 3% (funder)
          </button>
          <button
            disabled={busy || training === null}
            className={btn}
            onClick={() =>
              step(`remit 400 on loan ${training}`, "worker", async () => {
                const r = await laya.remit({ loanId: training!, amount: toUnits("400") });
                return { ...r, loan: await laya.getLoan(training!) };
              })
            }
          >
            4. Remit 400 (worker, share 15%)
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold">Medical bill · 65 USDC employer grant</h2>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} className={btn} onClick={() => request("medical", "65", config.accounts.clinic, setMedical)}>
            5. Request 65 (worker, provider = clinic)
          </button>
          <button disabled={busy || medical === null} className={btn} onClick={() => confirm(medical!, "clinic")}>
            6. Confirm (clinic)
          </button>
          <button disabled={busy || medical === null} className={btn} onClick={() => fund(medical!, "employer", "Grant", 0)}>
            7. Pay as employer: Grant (employer)
          </button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button disabled={busy} className={btn} onClick={() => step("list loans", null, () => laya.listLoans())}>
          List loans
        </button>
        <button
          disabled={busy || !mock}
          className="rounded border border-red-400 px-3 py-1 text-red-700 disabled:opacity-40"
          onClick={() => {
            mock?.reset();
            setTraining(null);
            setMedical(null);
            setLog([]);
            void refresh();
          }}
        >
          Reset mock
        </button>
      </div>

      <section>
        <h2 className="font-semibold">Balances (test USDC)</h2>
        <ul>
          {ROLES.map((r) => (
            <li key={r}>
              {r}: {balances[r] ?? "…"}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Log (newest first)</h2>
        <pre className="max-h-[32rem] space-y-2 overflow-auto whitespace-pre-wrap rounded bg-gray-100 p-3 text-xs">
          {log.length ? log.join("\n\n") : "Nothing yet."}
        </pre>
      </section>
      </div>
    </PageShell>
  );
}
