import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import type { Signer } from "../src/lib/client/signer";

/** Signs with a secret key. For scripts only (smoke test); never import this from app code. */
export class KeypairSigner implements Signer {
  private readonly keypair: Keypair;

  constructor(secret: string) {
    this.keypair = Keypair.fromSecret(secret); // throws on a malformed secret
  }

  get publicKey(): string {
    return this.keypair.publicKey();
  }

  async address(): Promise<string> {
    return this.keypair.publicKey();
  }

  async signTransaction(xdr: string, opts: { networkPassphrase: string }): Promise<string> {
    const tx = TransactionBuilder.fromXDR(xdr, opts.networkPassphrase);
    tx.sign(this.keypair);
    return tx.toXDR();
  }
}
