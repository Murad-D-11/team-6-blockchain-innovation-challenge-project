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
      <header className="masthead">
        <div className="mx-auto flex min-h-15 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <Link href="/" translate="no" className="text-2xl font-semibold tracking-tight hover:underline">Solstice</Link>
          <div className="flex items-center gap-2 text-xs">
            <Badge className="rounded-sm border-current bg-transparent text-inherit">{IS_MOCK ? "Mock demo" : "Stellar Testnet"}</Badge>
            {!publicView && mounted && address ? (
              <span className="flex flex-col items-end leading-tight">
                <span className="font-semibold">{ROLE_LABEL[role]}</span>
                <span className="font-mono opacity-80">{shortAddress(address)}</span>
              </span>
            ) : !publicView && mounted ? (
              <Button size="sm" onClick={() => laya.connect().catch((e) => setError(errorText(e)))}>Connect wallet</Button>
            ) : null}
          </div>
        </div>
        {error && <p role="alert" className="mx-auto max-w-6xl px-4 pb-2 text-sm text-red-700 sm:px-8">{error}</p>}
      </header>
      <main id="main-content" tabIndex={-1} className={`mx-auto space-y-6 px-4 pt-8 pb-12 sm:px-8 sm:pt-12 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
        <header className="space-y-2 border-b-2 border-foreground pb-4">
          <h1 className="text-3xl leading-none font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="max-w-xl text-base text-muted-foreground">{subtitle}</p>}
        </header>
        {children}
      </main>
    </div>
  );
}

export default PageShell;
