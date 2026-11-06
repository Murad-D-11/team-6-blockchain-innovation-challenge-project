import { getAddress, getNetwork, isConnected, requestAccess } from "@stellar/freighter-api";
import { config } from "../config";
import { isValidAccount } from "../address";
import { WALLET_PROBLEM } from "../errors";
import { LayaError } from "../types";

/** Logs the original Freighter error for debugging and returns the plain message for the user. */
function walletProblem(e: { message?: string }): LayaError {
  console.error("Freighter error:", e);
  return new LayaError(0, WALLET_PROBLEM);
}

const NOT_INSTALLED = "Freighter wallet not found. Install the Freighter extension and reload.";
const REJECTED = "Connection request was rejected in Freighter";
const WRONG_NETWORK = "Switch Freighter to Testnet";

/** Freighter reports a user decline as an error object; its code is not exported, so match the message too. */
function isRejection(e: { code?: number; message?: string }): boolean {
  return /declin|reject|den(y|ied)|cancel/i.test(e.message ?? "");
}

/** Throws LayaError(0, ...) if Freighter is missing, rejects, or is not on Testnet. Returns the G-address. */
export async function connectFreighter(): Promise<string> {
  let connected: boolean;
  try {
    const r = await isConnected();
    connected = !r.error && r.isConnected;
  } catch {
    connected = false;
  }
  if (!connected) throw new LayaError(0, NOT_INSTALLED);

  const access = await requestAccess();
  if (access.error) {
    throw isRejection(access.error) ? new LayaError(0, REJECTED) : walletProblem(access.error);
  }

  const net = await getNetwork();
  if (net.error) throw walletProblem(net.error);
  if (net.networkPassphrase !== config.networkPassphrase) throw new LayaError(0, WRONG_NETWORK);

  const addr = await getAddress();
  if (addr.error) {
    throw isRejection(addr.error) ? new LayaError(0, REJECTED) : walletProblem(addr.error);
  }
  if (!isValidAccount(addr.address)) throw new LayaError(0, "Freighter returned an invalid address");
  return addr.address;
}
