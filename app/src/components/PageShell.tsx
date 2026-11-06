"use client";

import Link from "next/link";
import { useState } from "react";
import { useMounted } from "./hooks";
import { shortAddress } from "@/lib/address";
import { useLaya } from "@/lib/hooks/useLaya";
import { useWallet } from "@/lib/hooks/useWallet";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { errorText } from "./errors";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const ROLE_LABEL: Record<string, string> = {
  worker: "Worker", family: "Family", funder: "Funder", creditor: "Provider", employer: "Employer", admin: "Admin", unknown: "Not a demo account",
};

/** Page frame: header with role, connected address and a Testnet badge. Mobile-first, max width ~ phone/tablet. */
export function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const laya = useLaya();
  const { address, role } = useWallet();
  const mounted = useMounted();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-full bg-muted/40">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight">Laya</Link>
          <div className="flex items-center gap-2 text-xs">
            <Badge className="border-amber-300 bg-amber-100 text-amber-900">Testnet{IS_MOCK ? " · mock" : ""}</Badge>
            {mounted && address ? (
              <span className="flex flex-col items-end leading-tight">
                <span className="font-semibold">{ROLE_LABEL[role]}</span>
                <span className="font-mono text-muted-foreground">{shortAddress(address)}</span>
              </span>
            ) : mounted ? (
              <Button size="sm" onClick={() => laya.connect().catch((e) => setError(errorText(e)))}>Connect</Button>
            ) : null}
          </div>
        </div>
        {error && <p className="mx-auto max-w-2xl px-4 pb-2 text-xs text-red-700">{error}</p>}
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}

export default PageShell;
