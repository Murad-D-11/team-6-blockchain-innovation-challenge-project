"use client";

import { useCallback, useEffect, useState } from "react";
import config from "@/lib/config";
import { MockLayaClient } from "@/lib/client/mock";
import { useLaya } from "@/lib/hooks/useLaya";
import { useWallet } from "@/lib/hooks/useWallet";
import { LayaError } from "@/lib/types";
import { fromUnits, toUnits } from "@/lib/units";
import type { AccountRole } from "@/lib/roles";

const HASH = "ab".repeat(32);
const ROLES = ["worker", "family", "funder", "creditor", "admin"] as const;

function show(v: unknown): string {
  return JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? `${x.toString()} (${fromUnits(x, 7)} USDC)` : x), 2);
}

export default function DevPage() {
  const laya = useLaya();
  const { role } = useWallet();
  const [log, setLog] = useState<string[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [lastReq, setLastReq] = useState<number | null>(null);
  const [lastLoan, setLastLoan] = useState<number | null>(null);
  const mock = laya instanceof MockLayaClient ? laya : null;

  const refresh = useCallback(async () => {
    try {
      const out: Record<string, string> = {};
      for (const r of ROLES) out[r] = fromUnits(await laya.getBalance(config.accounts[r]));
      setBalances(out);
    } catch {
      /* real client not ready */
    }
  }, [laya]);

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

  const request = (principal: string) =>
    step(`request ${principal} USDC / 12 months / 15%`, "worker", async () => {
      const r = await laya.requestPayoff({
        family: config.accounts.family,
        creditor: config.accounts.creditor,
        principal: toUnits(principal),
        months: 12,
        shareBps: 1500,
        docHash: HASH,
      });
      setLastReq(r.requestId);
      return { ...r, request: await laya.getRequest(r.requestId) };
    });

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6 text-sm">
      <h1 className="text-xl font-bold">/dev: golden flow on the mock</h1>
      {!mock && <p className="text-red-600">Not running on the mock (NEXT_PUBLIC_USE_MOCK is not &quot;true&quot;).</p>}
      <p>
        Acting as: <b>{role}</b> · last request: {lastReq ?? "none"} · last loan: {lastLoan ?? "none"}
      </p>

      <div className="flex flex-wrap gap-2">
        <button disabled={busy} className="rounded border px-3 py-1" onClick={() => request("860")}>
          1. Request 860 (worker)
        </button>
        <button
          disabled={busy || !lastReq}
          className="rounded border px-3 py-1"
          onClick={() => step(`confirm request ${lastReq}`, "creditor", () => laya.confirmRequest(lastReq!))}
        >
          2. Confirm (creditor)
        </button>
        <button
          disabled={busy || !lastReq}
          className="rounded border px-3 py-1"
          onClick={() =>
            step(`fund request ${lastReq} as Loan 3%`, "funder", async () => {
              const r = await laya.fundRequest({ requestId: lastReq!, mode: "Loan", feeBps: 300 });
              setLastLoan(r.loanId);
              return { ...r, loan: await laya.getLoan(r.loanId) };
            })
          }
        >
          3. Fund Loan 3% (funder)
        </button>
        <button
          disabled={busy || !lastLoan}
          className="rounded border px-3 py-1"
          onClick={() =>
            step(`remit 400 on loan ${lastLoan}`, "worker", async () => {
              const r = await laya.remit({ loanId: lastLoan!, amount: toUnits("400") });
              return { ...r, loan: await laya.getLoan(lastLoan!) };
            })
          }
        >
          4. Remit 400 (worker)
        </button>
        <button
          disabled={busy}
          className="rounded border px-3 py-1"
          onClick={async () => {
            await request("500");
          }}
        >
          5a. Second request 500 (worker)
        </button>
        <button
          disabled={busy || !lastReq}
          className="rounded border px-3 py-1"
          onClick={async () => {
            await step(`confirm request ${lastReq}`, "creditor", () => laya.confirmRequest(lastReq!));
            await step(`fund request ${lastReq} as Grant`, "funder", async () => {
              const r = await laya.fundRequest({ requestId: lastReq!, mode: "Grant", feeBps: 0 });
              return { ...r, loan: await laya.getLoan(r.loanId) };
            });
          }}
        >
          5b. Confirm + fund as Grant
        </button>
        <button
          disabled={busy}
          className="rounded border px-3 py-1"
          onClick={() => step("list loans", null, () => laya.listLoans())}
        >
          List loans
        </button>
        <button
          disabled={busy || !mock}
          className="rounded border border-red-400 px-3 py-1 text-red-700"
          onClick={() => {
            mock?.reset();
            setLastReq(null);
            setLastLoan(null);
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
    </main>
  );
}
