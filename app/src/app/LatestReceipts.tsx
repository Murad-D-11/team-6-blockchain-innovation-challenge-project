"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLaya } from "@/lib/hooks/useLaya";
import { cn } from "@/lib/utils";

/** The two newest Funded requests, read on the client after mount. Renders <li> receipt slips. */
export function LatestReceipts() {
  const client = useLaya();
  const [ids, setIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client
      .listRequests()
      .then((reqs) => {
        if (cancelled) return;
        setIds(
          reqs
            .filter((r) => r.status === "Funded")
            .slice(0, 2)
            .map((r) => r.id),
        );
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setIds([]);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  // Each receipt is a small paper slip. Fixed minimum height so nothing jumps when data arrives.
  const slipClass = "ticket flex min-h-40 flex-col justify-between px-4 py-4";

  if (!loaded) {
    return (
      <li className={slipClass} aria-live="polite">
        <span aria-hidden="true" className="block h-12 w-24 bg-[var(--slip-rule)]" />
        <span className="font-semibold">Loading receipts…</span>
      </li>
    );
  }

  if (ids.length === 0) {
    return (
      <li className={slipClass}>
        <span aria-hidden="true" className="num block text-5xl leading-none text-[var(--slip-rule)]">#</span>
        <span>
          <span className="block font-semibold">No receipts yet</span>
          <span className="block text-sm slip-muted">Public proof appears once a request is funded</span>
        </span>
      </li>
    );
  }

  return (
    <>
      {ids.map((id) => (
        <li key={id} className={cn(slipClass, "relative")}>
          <span aria-hidden="true" className="num block text-5xl leading-none">#{id}</span>
          <span>
            <Link
              href={`/proof/${id}`}
              className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:text-foreground"
            >
              Receipt #{id}
            </Link>
            <span className="block text-sm slip-muted">Public proof for request #{id}</span>
          </span>
        </li>
      ))}
    </>
  );
}
