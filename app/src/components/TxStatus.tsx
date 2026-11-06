import { TxLink } from "./TxLink";

/** Loading line, then the tx link or a friendly error. Use under every write button. */
export function TxStatus({ busy, error, txHash, busyText = "Waiting for signature and network…" }: {
  busy: boolean;
  error: string | null;
  txHash?: string | null;
  busyText?: string;
}) {
  if (busy) return <p className="text-sm text-muted-foreground" role="status">{busyText}</p>;
  if (error) return <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">{error}</p>;
  if (txHash) return <TxLink hash={txHash} />;
  return null;
}
