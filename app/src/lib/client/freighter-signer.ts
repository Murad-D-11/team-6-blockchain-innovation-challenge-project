import { signTransaction } from "@stellar/freighter-api";
import { WALLET_PROBLEM } from "../errors";
import { LayaError } from "../types";
import { connectFreighter } from "./wallet";
import type { Signer } from "./signer";

const REJECTED = "Signing was rejected in Freighter";

/** Signer backed by the Freighter extension. Every failure surfaces as LayaError(0, ...). */
export class FreighterSigner implements Signer {
  address(): Promise<string> {
    return connectFreighter(); // already maps missing wallet, rejection and wrong network to LayaError(0)
  }

  async signTransaction(xdr: string, opts: { networkPassphrase: string }): Promise<string> {
    let r: Awaited<ReturnType<typeof signTransaction>>;
    try {
      r = await signTransaction(xdr, { networkPassphrase: opts.networkPassphrase });
    } catch (e) {
      if (e instanceof LayaError) throw e;
      console.error("Freighter error:", e);
      throw new LayaError(0, WALLET_PROBLEM);
    }
    if (r.error) {
      const rejected = /declin|reject|den(y|ied)|cancel/i.test(r.error.message ?? "");
      if (!rejected) console.error("Freighter error:", r.error);
      throw new LayaError(0, rejected ? REJECTED : WALLET_PROBLEM);
    }
    return r.signedTxXdr;
  }
}
