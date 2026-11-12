import config from "@/lib/config";
import { shortAddress } from "@/lib/address";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/** Link to the transaction on stellar.expert. On the mock the hash is fake, so it is labelled. */
export function TxLink({ hash, label = "View transaction" }: { hash: string; label?: string }) {
  return (
    <a
      href={`${config.explorerTxUrl}${hash}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex flex-wrap items-center gap-x-1 text-sm text-primary underline underline-offset-3 hover:text-foreground"
    >
      {label} <span className="font-mono text-xs">{shortAddress(hash)}</span>
      {IS_MOCK && <span className="text-xs text-muted-foreground no-underline">(mock, not on chain)</span>}
    </a>
  );
}

export default TxLink;
