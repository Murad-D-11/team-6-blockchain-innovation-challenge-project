"use client";

import { useState } from "react";
import { useMounted } from "./hooks";
import { useLaya } from "@/lib/hooks/useLaya";
import { useWallet } from "@/lib/hooks/useWallet";
import type { Role } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { errorText } from "./errors";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const NAMES: Record<Role, string> = {
  worker: "Worker", family: "Family", funder: "Funder", creditor: "Provider", employer: "Employer", admin: "Admin", unknown: "Unknown",
};

/** Renders children only when the connected account has the expected role. */
export function RoleGuard({ role, children }: { role: Exclude<Role, "unknown">; children: React.ReactNode }) {
  const laya = useLaya();
  const wallet = useWallet();
  const mounted = useMounted();
  const [error, setError] = useState<string | null>(null);

  if (!mounted) return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  if (wallet.role === role) return <>{children}</>;

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle>Switch Freighter to the {NAMES[role]} account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          {wallet.address
            ? `You're connected as ${NAMES[wallet.role]}. This page needs the ${NAMES[role]} account.`
            : "No wallet connected yet."}
        </p>
        {IS_MOCK && (
          <p className="text-muted-foreground">
            On the mock, add <code>?role={role}</code> to the URL{role === "creditor" ? <> (or <code>?role=clinic</code>)</> : null}.
          </p>
        )}
        {!IS_MOCK && (
          <Button
            onClick={() => laya.connect().catch((e) => setError(errorText(e)))}
          >
            {wallet.address ? "Reconnect Freighter" : "Connect Freighter"}
          </Button>
        )}
        {error && <p className="text-red-700">{error}</p>}
      </CardContent>
    </Card>
  );
}

export default RoleGuard;
