/** Friendly user-facing messages for LayaError codes. 0 = wallet / user rejected / network; 1-11 = contract Error enum. */
export const ERROR_MESSAGES: Readonly<Record<number, string>> = {
  0: "Something went wrong with your wallet or the network. Please try again.",
  1: "The Laya contract is already set up.", // AlreadyInitialized (reserved)
  2: "The Laya contract is not set up yet.", // NotInitialized (reserved)
  3: "That lender is not on the registered list.", // CreditorNotRegistered
  4: "We couldn't find that request.", // RequestNotFound
  5: "This request isn't in the right step for that action.", // InvalidRequestStatus
  6: "We couldn't find that loan.", // LoanNotFound
  7: "The repayment share must be between 1% and 15%, and can't go below the share agreed at funding.", // InvalidShare
  8: "Enter an amount greater than zero (and below the maximum).", // InvalidAmount
  9: "Choose between 1 and 60 months.", // InvalidMonths
  10: "The fee is not allowed: a loan fee can be at most 8%, and a grant has no fee.", // InvalidFee
  11: "The period must be greater than zero seconds.", // InvalidPeriod
};

const UNKNOWN = ERROR_MESSAGES[0];

export function friendlyMessage(code: number): string {
  return ERROR_MESSAGES[code] ?? UNKNOWN;
}
