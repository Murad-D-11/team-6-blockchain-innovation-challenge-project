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

export function PageShell({ title, subtitle, children, wide = false, publicView = false }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
  publicView?: boolean;
}) {
  const laya = useLaya();
  const { address, role } = useWallet();
  const mounted = useMounted();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-full">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-20 focus:bg-card focus:p-3">Skip to content</a>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <Link href="/" translate="no" className="text-xl font-bold tracking-[-0.055em] hover:text-primary">Solstice</Link>
          <div className="flex items-center gap-2 text-xs">
            <Badge className="border-border bg-secondary text-foreground">{IS_MOCK ? "Mock demo" : "Stellar Testnet"}</Badge>
            {!publicView && mounted && address ? (
              <span className="flex flex-col items-end leading-tight">
                <span className="font-semibold">{ROLE_LABEL[role]}</span>
                <span className="font-mono text-muted-foreground">{shortAddress(address)}</span>
              </span>
            ) : !publicView && mounted ? (
              <Button size="sm" onClick={() => laya.connect().catch((e) => setError(errorText(e)))}>Connect wallet</Button>
            ) : null}
          </div>
        </div>
        {error && <p role="alert" className="mx-auto max-w-6xl px-4 pb-2 text-sm text-red-700 sm:px-8">{error}</p>}
      </header>
      <main id="main-content" tabIndex={-1} className={`mx-auto space-y-6 px-4 pt-8 pb-12 sm:px-8 sm:pt-12 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
        <header className="space-y-2 border-b border-border pb-5 sm:pb-7">
          <h1 className="text-4xl leading-none font-semibold tracking-[-0.055em] sm:text-5xl">{title}</h1>
          {subtitle && <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p>}
        </header>
        {children}
      </main>
    </div>
  );
}

export default PageShell;
