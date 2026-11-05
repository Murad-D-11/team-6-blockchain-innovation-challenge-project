/**
 * Who signs transactions for a RealLayaClient. Interface only: no key handling lives here,
 * so this file is safe to bundle for the browser.
 *   - FreighterSigner (app): wraps the Freighter wallet.
 *   - KeypairSigner (app/scripts, smoke test only): signs with a secret key.
 */
export interface Signer {
  /** The G-address this signer signs for. May open a wallet popup. */
  address(): Promise<string>;
  /** Signs a transaction envelope (base64 XDR) and returns the signed envelope (base64 XDR). */
  signTransaction(xdr: string, opts: { networkPassphrase: string }): Promise<string>;
}
