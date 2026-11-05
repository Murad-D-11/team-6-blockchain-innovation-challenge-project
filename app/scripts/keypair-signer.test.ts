import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { KeypairSigner } from "./keypair-signer";

const PASSPHRASE = Networks.TESTNET;

function unsignedXdr(source: string, dest: string): string {
  return new TransactionBuilder(new Account(source, "1"), { fee: "100", networkPassphrase: PASSPHRASE })
    .addOperation(Operation.payment({ destination: dest, asset: Asset.native(), amount: "1" }))
    .setTimeout(30)
    .build()
    .toXDR();
}

describe("KeypairSigner", () => {
  const kp = Keypair.random(); // throwaway, generated per run
  const signer = new KeypairSigner(kp.secret());

  it("reports the public key", async () => {
    expect(await signer.address()).toBe(kp.publicKey());
    expect(signer.publicKey).toBe(kp.publicKey());
  });

  it("returns signed XDR whose signature verifies against the public key", async () => {
    const xdr = unsignedXdr(kp.publicKey(), Keypair.random().publicKey());
    const signed = await signer.signTransaction(xdr, { networkPassphrase: PASSPHRASE });
    const tx = TransactionBuilder.fromXDR(signed, PASSPHRASE);
    expect(tx.signatures).toHaveLength(1);
    expect(kp.verify(tx.hash(), tx.signatures[0].signature)).toBe(true);
    expect(Keypair.random().verify(tx.hash(), tx.signatures[0].signature)).toBe(false);
  });

  it("does not verify under a different network passphrase", async () => {
    const xdr = unsignedXdr(kp.publicKey(), Keypair.random().publicKey());
    const signed = await signer.signTransaction(xdr, { networkPassphrase: PASSPHRASE });
    const other = TransactionBuilder.fromXDR(signed, Networks.PUBLIC);
    expect(kp.verify(other.hash(), other.signatures[0].signature)).toBe(false);
  });

  it("rejects a malformed secret", () => {
    expect(() => new KeypairSigner("not-a-secret")).toThrow();
  });
});
