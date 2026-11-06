import { config } from "../config";
import { NETWORK_PROBLEM } from "../errors";
import { LayaError } from "../types";
import { toUnits } from "../units";

interface HorizonBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

/** Returns the account's balances, or null if the account does not exist yet (404). */
async function loadBalances(address: string): Promise<HorizonBalance[] | null> {
  let res: Response;
  try {
    res = await fetch(`${config.horizonUrl}/accounts/${encodeURIComponent(address)}`);
  } catch {
    throw new LayaError(0, "Could not reach the Stellar network. Check your connection.");
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`Horizon returned HTTP ${res.status} for ${address}`);
    throw new LayaError(0, NETWORK_PROBLEM);
  }
  const body = (await res.json()) as { balances?: HorizonBalance[] };
  return Array.isArray(body.balances) ? body.balances : [];
}

function findUsdc(balances: HorizonBalance[]): HorizonBalance | undefined {
  return balances.find(
    (b) => b.asset_code === config.asset.code && b.asset_issuer === config.asset.issuer,
  );
}

/** Test USDC balance, 7 decimals. 0n if the account or trustline does not exist. */
export async function getUsdcBalance(address: string): Promise<bigint> {
  const balances = await loadBalances(address);
  const usdc = balances && findUsdc(balances);
  return usdc ? toUnits(usdc.balance) : 0n;
}

export async function hasUsdcTrustline(address: string): Promise<boolean> {
  const balances = await loadBalances(address);
  return !!balances && !!findUsdc(balances);
}
