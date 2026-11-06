/**
 * Golden-flow smoke test (PLAN-v2). Runs through the LayaClient interface only.
 *
 *   npm run smoke:mock
 *   npm run smoke:real            (full golden flow on testnet; reads LAYA_SECRET_* from .env.local)
 *   npm run smoke:real -- --reads (read-only checks on testnet; needs no keys)
 *
 * `actAs(role)` returns the client that acts as that account. The mock returns one shared client
 * switched to the role; the real backend returns one RealLayaClient per role, each with its own
 * KeypairSigner. runGoldenFlow() never knows which backend it is talking to.
 */
import config from "../src/lib/config";
import { MockLayaClient } from "../src/lib/client/mock";
import { RealLayaClient } from "../src/lib/client/real";
import type { AccountRole } from "../src/lib/roles";
import { toUnits } from "../src/lib/units";
import type { LayaClient } from "../src/lib/types";
import { KeypairSigner } from "./keypair-signer";

export type ActAs = (role: AccountRole) => LayaClient | Promise<LayaClient>;

const DOC_HASH_TRAINING = "a".repeat(64);
const DOC_HASH_MEDICAL = "b".repeat(64);

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}: ${String(actual)}${ok ? "" : `  (expected ${String(expected)})`}`);
}

export async function runGoldenFlow(actAs: ActAs): Promise<number> {
  failures = 0;
  const a = config.accounts;

  console.log("\n1. Training bill: 190 USDC, Loan at 300 bps");
  let client = await actAs("worker");
  const req1 = await client.requestPayoff({
    family: a.family,
    creditor: a.creditor,
    principal: toUnits("190"),
    months: 12,
    shareBps: 1500,
    docHash: DOC_HASH_TRAINING,
  });
  console.log(`  requestId ${req1.requestId}, tx ${req1.txHash}`);
  check("legalAmount", (await client.getRequest(req1.requestId)).legalAmount, 1_900_000_000n);

  client = await actAs("creditor");
  await client.confirmRequest(req1.requestId);
  check("status after confirm", (await client.getRequest(req1.requestId)).status, "Confirmed");

  client = await actAs("funder");
  const fund1 = await client.fundRequest({ requestId: req1.requestId, mode: "Loan", feeBps: 300 });
  const loan1 = await client.getLoan(fund1.loanId);
  console.log(`  loanId ${fund1.loanId}, tx ${fund1.txHash}`);
  check("outstanding", loan1.outstanding, 1_957_000_000n);
  check("status", loan1.status, "Active");

  console.log("\n2. Remit 400 USDC at 15% share");
  client = await actAs("worker");
  const rem = await client.remit({ loanId: fund1.loanId, amount: 4_000_000_000n });
  console.log(`  tx ${rem.txHash}`);
  check("toLender", rem.toLender, 600_000_000n);
  check("toFamily", rem.toFamily, 3_400_000_000n);
  check("outstanding", rem.outstanding, 1_357_000_000n);
  check("loan outstanding (read back)", (await client.getLoan(fund1.loanId)).outstanding, 1_357_000_000n);

  console.log("\n3. Medical exam: 65 USDC, Grant paid by employer");
  client = await actAs("worker");
  const req2 = await client.requestPayoff({
    family: a.family,
    creditor: a.clinic,
    principal: toUnits("65"),
    months: 12,
    shareBps: 1500,
    docHash: DOC_HASH_MEDICAL,
  });
  console.log(`  requestId ${req2.requestId}, tx ${req2.txHash}`);

  client = await actAs("clinic");
  await client.confirmRequest(req2.requestId);
  check("status after confirm", (await client.getRequest(req2.requestId)).status, "Confirmed");

  client = await actAs("employer");
  const fund2 = await client.fundRequest({ requestId: req2.requestId, mode: "Grant", feeBps: 0 });
  const loan2 = await client.getLoan(fund2.loanId);
  console.log(`  loanId ${fund2.loanId}, tx ${fund2.txHash}`);
  check("legalAmount", loan2.legalAmount, 650_000_000n);
  check("outstanding", loan2.outstanding, 0n);
  check("status", loan2.status, "Repaid");

  console.log(failures === 0 ? "\nSMOKE PASSED" : `\nSMOKE FAILED (${failures} check${failures === 1 ? "" : "s"})`);
  return failures;
}

/** Read-only checks against the deployed contract. Needs no keys: nothing is signed or sent. */
export async function runReads(client: LayaClient): Promise<number> {
  failures = 0;
  const a = config.accounts;

  console.log("\nContract " + config.contractId);
  console.log("getConfig");
  const cfg = await client.getConfig();
  console.log("  found", JSON.stringify(cfg));
  check("periodSecs", cfg.periodSecs, config.periodSecs);
  check("maxPausePeriods", cfg.maxPausePeriods, config.maxPausePeriods);
  check("admin", cfg.admin, a.admin);
  check("token", cfg.token, config.tokenContractId);

  console.log("isCreditor");
  check("creditor", await client.isCreditor(a.creditor), true);
  check("clinic", await client.isCreditor(a.clinic), true);
  check("worker", await client.isCreditor(a.worker), false);

  console.log("listRequests");
  const requests = await client.listRequests();
  check("is an array", Array.isArray(requests), true);
  console.log(`  found ${requests.length} request(s) on chain`);
  for (const r of requests.slice(0, 3)) {
    console.log(`  #${r.id} ${r.status}, legalAmount ${r.legalAmount}, creditor ${r.creditor.slice(0, 6)}…`);
  }

  console.log("listLoans");
  const loans = await client.listLoans();
  console.log(`  found ${loans.length} loan(s)`);
  for (const l of loans.slice(0, 3)) {
    console.log(`  #${l.id} ${l.mode} ${l.status}, outstanding ${l.outstanding}, missedPeriods ${l.missedPeriods}, overdue ${l.isOverdue}`);
  }

  console.log(failures === 0 ? "\nREADS PASSED" : `\nREADS FAILED (${failures} check${failures === 1 ? "" : "s"})`);
  return failures;
}

const ROLES: AccountRole[] = ["worker", "funder", "creditor", "clinic", "employer", "admin"];

/** One RealLayaClient per role, each signing with that role's secret. Aborts on any key/address mismatch. */
export function realActAs(): ActAs {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    /* no .env.local: fall back to the real environment */
  }
  const clients = new Map<AccountRole, RealLayaClient>();
  for (const role of ROLES) {
    const name = `LAYA_SECRET_${role.toUpperCase()}`;
    const secret = process.env[name];
    if (!secret) throw new Error(`${name} is not set (see .env.example)`);
    const signer = new KeypairSigner(secret);
    if (signer.publicKey !== config.accounts[role]) {
      throw new Error(
        `${name} does not match config.accounts.${role}: derived ${signer.publicKey}, expected ${config.accounts[role]}`,
      );
    }
    clients.set(role, new RealLayaClient({ signer }));
  }
  console.log(`Keys OK: ${ROLES.length} secrets match config.accounts`);
  return async (role) => {
    const c = clients.get(role);
    if (!c) throw new Error(`No client for role ${role}`);
    await c.connect();
    return c;
  };
}

async function main(): Promise<void> {
  const backend = process.argv[2] ?? "mock";
  if (process.argv.includes("--reads")) {
    if (backend !== "real") {
      console.error("--reads only applies to the real backend: npm run smoke:real -- --reads");
      process.exit(2);
    }
    // No keys: a signer that refuses, so any accidental write fails loudly.
    const noKeys = {
      address: async (): Promise<string> => { throw new Error("--reads has no signer"); },
      signTransaction: async (): Promise<string> => { throw new Error("--reads has no signer"); },
    };
    const failed = await runReads(new RealLayaClient({ signer: noKeys }));
    process.exit(failed === 0 ? 0 : 1);
  }
  let actAs: ActAs;
  if (backend === "mock") {
    const mock = new MockLayaClient({ delayMs: 0, storage: null, sessionStorage: null, search: () => "" });
    actAs = (role) => {
      mock.setRole(role);
      return mock;
    };
  } else if (backend === "real") {
    actAs = realActAs();
  } else {
    console.error(`Unknown backend "${backend}". Use "mock" or "real".`);
    process.exit(2);
  }
  const failed = await runGoldenFlow(actAs);
  process.exit(failed === 0 ? 0 : 1);
}

// Run only when executed directly, not when imported (e.g. by a test).
const entry = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (entry.endsWith("/scripts/smoke.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
