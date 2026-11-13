"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLaya } from "@/lib/hooks/useLaya";

/** Step 5 of the home page: links to the newest Funded request's public receipt, read on the client after mount.
 *  Until one exists (or while the read is in flight) it renders the label as plain text. */
export function NewestReceiptLink({ label, className }: { label: string; className: string }) {
  const client = useLaya();
  const [id, setId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    client
      .listRequests()
      .then((reqs) => {
        if (cancelled) return;
        const newest = reqs.filter((r) => r.status === "Funded")[0];
        setId(newest ? newest.id : null);
      })
      .catch(() => {
        if (!cancelled) setId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  if (id === null) {
    return <span className="mt-3 block min-h-11 font-semibold">{label}</span>;
  }

  return (
    <Link href={`/proof/${id}`} className={className}>
      {label}
    </Link>
  );
}
