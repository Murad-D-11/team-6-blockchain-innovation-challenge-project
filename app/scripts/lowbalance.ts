/**
 * Low-balance check on testnet (no Freighter). The funder tries to fund a 5,000,000 USDC Loan it
 * cannot afford; the contract call must fail with the USDC balance/trustline message (not InvalidFee).
 * The request is always cancelled afterwards so nothing stays open.
 *
 *   npm run smoke:lowbalance      (reads LAYA_SECRET_* from .env.local)
 */
import config from "../src/lib/config";
import { TOKEN_FAILURE_MESSAGE } from "../src/lib/client/real-translate";
import { LayaError } from "../src/lib/types";
import { toUnits } from "../src/lib/units";
import { realActAs } from "./smoke";

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `: ${detail}` : ""}`);
}

async function main(): Promise<number> {
  const actAs = realActAs();
  const a = config.accounts;

  console.log("\n1. Worker requests 5,000,000 USDC, share 1500; creditor confirms");
  let client = await actAs("worker");
  const req = await client.requestPayoff({
    family: a.family,
    creditor: a.creditor,
    principal: toUnits("5000000"),
    months: 12,
    shareBps: 1500,
    docHash: "c".repeat(64),
  });
  console.log(`  requestId ${req.requestId}, tx ${req.txHash}`);
  try {
    client = await actAs("creditor");
    await client.confirmRequest(req.requestId);
    check("status after confirm", (await client.getRequest(req.requestId)).status === "Confirmed");

    console.log("\n2. Funder tries to fund as a Loan at 300 bps (must fail: balance too low)");
    client = await actAs("funder");
    try {
      const r = await client.fundRequest({ requestId: req.requestId, mode: "Loan", feeBps: 300 });
      check("fundRequest should have failed", false, `succeeded, loanId ${r.loanId}, tx ${r.txHash}`);
    } catch (e) {
      if (e instanceof LayaError) {
        console.log(`  LayaError code ${e.code}: ${e.message}`);
        check("code is not 10 (InvalidFee)", e.code !== 10, `code ${e.code}`);
        check("message is the USDC balance/trustline one", e.message === TOKEN_FAILURE_MESSAGE);
        if (e.code === 10 || e.message !== TOKEN_FAILURE_MESSAGE) {
          console.log("  RAW ERROR (mapping needs a fix):", e);
          console.log("  cause:", (e as { cause?: unknown }).cause);
        }
      } else {
        check("error is a LayaError", false);
        console.log("  RAW ERROR:", e);
      }
    }
  } finally {
    console.log("\n3. Worker cancels the request");
    const w = await actAs("worker");
    await w.cancelRequest(req.requestId);
    const status = (await w.getRequest(req.requestId)).status;
    check("status is Cancelled", status === "Cancelled", status);
  }

  console.log(failures === 0 ? "\nLOWBALANCE PASSED" : `\nLOWBALANCE FAILED (${failures} check${failures === 1 ? "" : "s"})`);
  return failures;
}

main()
  .then((f) => process.exit(f === 0 ? 0 : 1))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
