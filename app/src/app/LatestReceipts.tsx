"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLaya } from "@/lib/hooks/useLaya";

/** The two newest Funded requests, read on the client after mount. Renders <li> items for the demo <ol>. */
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

  if (!loaded) {
    return (
      <li>
        <span className="font-medium">Loading receipts…</span>
        <span className="block text-sm text-muted-foreground">Reading the latest funded requests from Stellar</span>
      </li>
    );
  }

  if (ids.length === 0) {
    return (
      <li>
        <span className="font-medium">No receipts yet</span>
        <span className="block text-sm text-muted-foreground">Public proof appears once a request is funded</span>
      </li>
    );
  }

  return (
    <>
      {ids.map((id) => (
        <li key={id}>
          <Link href={`/proof/${id}`} className="font-medium text-blue-600 underline">
            Receipt #{id}
          </Link>
          <span className="block text-sm text-muted-foreground">Public proof for request #{id}</span>
        </li>
      ))}
    </>
  );
}
