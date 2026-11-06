/** Friendly user-facing messages for LayaError codes. 0 = wallet / user rejected / network; 1-11 = contract Error enum. */
export const ERROR_MESSAGES: Readonly<Record<number, string>> = {
  0: "Something went wrong with your wallet or the network. Check your connection and try again.",
  1: "The Laya contract is already set up. No action needed.", // AlreadyInitialized (reserved)
  2: "The Laya contract is not set up yet. Ask the admin to set it up.", // NotInitialized (reserved)
  3: "This provider is not on the verified list. Choose a provider from the list.", // CreditorNotRegistered
  4: "We couldn't find that request. Check the number and try again.", // RequestNotFound
  5: "This request has already moved on. Refresh the page to see where it is now.", // InvalidRequestStatus
  6: "We couldn't find that loan. Check the number and try again.", // LoanNotFound
  7: "Choose a repayment share between 1% and 15%. It can't go below the share agreed when the loan was funded.", // InvalidShare
  8: "Enter an amount greater than zero and within the allowed maximum.", // InvalidAmount
  9: "Choose a number of months between 1 and 60.", // InvalidMonths
  10: "A loan fee can be at most 8%, and a grant has no fee. Change the fee and try again.", // InvalidFee
  11: "Enter a period longer than zero seconds.", // InvalidPeriod
};

/** Shown for an unexpected HTTP status from the Stellar network (Horizon). The original is logged, not shown. */
export const NETWORK_PROBLEM = "The Stellar network had a problem. Wait a moment and try again.";

/** Shown for an unexpected Freighter failure. The original is logged, not shown. */
export const WALLET_PROBLEM =
  "Freighter reported a problem. Open Freighter, make sure it is unlocked and set to Testnet, then try again.";

const UNKNOWN = ERROR_MESSAGES[0];

export function friendlyMessage(code: number): string {
  return ERROR_MESSAGES[code] ?? UNKNOWN;
}
