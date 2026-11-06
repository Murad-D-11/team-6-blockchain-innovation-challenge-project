import { friendlyMessage } from "@/lib/errors";
import { LayaError } from "@/lib/types";

/**
 * Text to show for a failed call. Contract errors (1-11) use the friendly table in lib/errors.ts.
 * Code 0 (wallet / network / mock checks) keeps the client's own message, which is already specific
 * ("Switch to the Worker account to do this", "Not enough test USDC").
 */
export function errorText(e: unknown): string {
  if (e instanceof LayaError) {
    if (e.code === 0) return e.message || friendlyMessage(0);
    return friendlyMessage(e.code);
  }
  return friendlyMessage(0);
}
