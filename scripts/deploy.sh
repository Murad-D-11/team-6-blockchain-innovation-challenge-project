#!/usr/bin/env bash
# Laya H4: build, deploy and wire up the laya contract on Stellar TESTNET. Safe to re-run.
#
#   1. checks that Horizon, the Soroban RPC and testnet.json all say TESTNET (stops otherwise)
#   2. stellar contract build   (in contracts/laya)
#   3. deploys a FRESH contract (constructor: admin, token, period_secs=60, max_pause_periods=3), source laya-admin
#   4. add_creditor for the creditor and the clinic account (signed by laya-admin)
#   5. verifies: get_config, is_creditor(creditor), is_creditor(clinic)
#   6. writes contractId and deployedAt into app/src/config/testnet.json (no other field changes)
#   7. generates the TypeScript bindings into packages/laya-bindings
#
# Every re-run deploys a new contract with a new id and overwrites contractId, deployedAt and the bindings.
# Secret keys stay in the Stellar CLI keystore. This script prints PUBLIC keys and contract ids only.
# Needs: stellar CLI 30.x, node + npx. Run from anywhere:  bash scripts/deploy.sh
set -euo pipefail

# Env vars that could silently point the CLI somewhere else.
unset STELLAR_NETWORK STELLAR_RPC_URL STELLAR_NETWORK_PASSPHRASE STELLAR_ACCOUNT \
      STELLAR_SIGN_WITH_KEY STELLAR_RPC_HEADERS STELLAR_CONTRACT_ID 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# pwd -W gives a Windows path under Git Bash (node can't read /c/...); plain pwd elsewhere.
ROOT="$(cd "$SCRIPT_DIR/.." && { pwd -W 2>/dev/null || pwd; })"
CONFIG="$ROOT/app/src/config/testnet.json"
CONTRACT_DIR="$ROOT/contracts/laya"
WASM="$CONTRACT_DIR/target/wasm32v1-none/release/laya.wasm"
BINDINGS_DIR="$ROOT/packages/laya-bindings"

NETWORK="testnet"
TESTNET_PASSPHRASE="Test SDF Network ; September 2015"
HORIZON="https://horizon-testnet.stellar.org"
RPC="https://soroban-testnet.stellar.org"
ADMIN_ID="laya-admin"
PERIOD_SECS=60
MAX_PAUSE_PERIODS=3
# Same major version as app/package.json ("@stellar/stellar-sdk": "^17.4.0"). The old
# `stellar contract bindings typescript` is deprecated; the JS SDK's own generator replaces it.
BINDINGS_SDK_VERSION="17.4.0"

say() { echo "[deploy] $*"; }
die() { echo "[deploy] ERROR: $*" >&2; exit 1; }
redact() { sed -E 's/S[A-Z2-7]{55}/<redacted-secret>/g'; }

command -v stellar >/dev/null || die "stellar CLI not found"
command -v node >/dev/null || die "node not found"
command -v npx >/dev/null || die "npx not found"
[ -f "$CONFIG" ] || die "config not found: $CONFIG"
[ -d "$CONTRACT_DIR" ] || die "contract folder not found: $CONTRACT_DIR"

# Read one field from testnet.json (dot path, e.g. accounts.creditor).
cfg() {
  node -e '
    const v = process.argv[2].split(".").reduce((o, k) => (o == null ? o : o[k]), JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")));
    if (v === undefined || v === null) { console.error("missing in testnet.json: " + process.argv[2]); process.exit(1); }
    console.log(v);
  ' "$CONFIG" "$1" | tr -d '\r'
}

# Run a command; on failure print its output (secret keys redacted) and return 1. Stdout is kept
# (so callers can capture it); stderr goes to a temp file and is only shown on failure.
ERRFILE="$(mktemp)"
trap 'rm -f "$ERRFILE"' EXIT
run_capture() {
  local out
  if ! out="$("$@" 2>"$ERRFILE")"; then
    echo "[deploy] FAILED: $*" >&2
    { printf '%s\n' "$out"; cat "$ERRFILE"; } | redact >&2
    return 1
  fi
  printf '%s\n' "$out" | tr -d '\r'
}

# Retry a flaky network call up to 4 times (RPC "SendRequest"/timeout errors are usually transient).
retry() {
  local i
  for i in 1 2 3 4; do
    if "$@"; then return 0; fi
    [ "$i" = "4" ] || { say "  attempt $i failed, retrying in 4s..." >&2; sleep 4; }
  done
  return 1
}

# 1. network guard -----------------------------------------------------------------------------
# Nothing below runs unless Horizon, the Soroban RPC and testnet.json all say TESTNET.
node -e '
  const [horizon, rpc, file, passphrase] = process.argv.slice(1);
  (async () => {
    const h = await (await fetch(horizon)).json();
    if (h.network_passphrase !== passphrase) throw new Error("Horizon is not testnet: " + h.network_passphrase);
    const r = await (await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getNetwork" }) })).json();
    if (!r.result || r.result.passphrase !== passphrase) throw new Error("Soroban RPC is not testnet");
    const c = JSON.parse(require("fs").readFileSync(file, "utf8"));
    if (c.network !== "testnet" || c.networkPassphrase !== passphrase)
      throw new Error("testnet.json network/networkPassphrase is not testnet");
  })().catch((e) => { console.error("[deploy] ERROR: " + e.message); process.exit(1); });
' "$HORIZON" "$RPC" "$CONFIG" "$TESTNET_PASSPHRASE" || exit 1
say "network check: Horizon, Soroban RPC and testnet.json are all TESTNET"

# Inputs, all public values.
ADMIN_ADDR="$(stellar keys address "$ADMIN_ID" | tr -d '\r')"
[[ "$ADMIN_ADDR" =~ ^G[A-Z2-7]{55}$ ]] || die "identity $ADMIN_ID did not give a valid public key"
CFG_ADMIN="$(cfg accounts.admin)"
[ "$ADMIN_ADDR" = "$CFG_ADMIN" ] || die "keystore $ADMIN_ID ($ADMIN_ADDR) does not match testnet.json accounts.admin ($CFG_ADMIN)"
TOKEN="$(cfg tokenContractId)"
CREDITOR="$(cfg accounts.creditor)"
CLINIC="$(cfg accounts.clinic)"
[[ "$TOKEN" =~ ^C[A-Z2-7]{55}$ ]] || die "tokenContractId in testnet.json is not a contract id: $TOKEN"
[[ "$CREDITOR" =~ ^G[A-Z2-7]{55}$ ]] || die "accounts.creditor is not a public key: $CREDITOR"
[[ "$CLINIC" =~ ^G[A-Z2-7]{55}$ ]] || die "accounts.clinic is not a public key: $CLINIC"
OLD_CONTRACT="$(cfg contractId)"
say "admin   = $ADMIN_ADDR"
say "token   = $TOKEN"
say "creditor= $CREDITOR"
say "clinic  = $CLINIC"
[ "$CREDITOR" != "$CLINIC" ] && say "(creditor and clinic are two different accounts)" || say "NOTE: creditor and clinic are the same account (fallback mode)"

# 2. build ---------------------------------------------------------------------------------------
say "building the contract (stellar contract build)..."
rm -f "$WASM"
( cd "$CONTRACT_DIR" && stellar contract build ) || die "stellar contract build failed"
[ -f "$WASM" ] || die "build finished but $WASM does not exist"
say "built $WASM"

# 3. deploy a fresh contract ---------------------------------------------------------------------
say "deploying a fresh contract (source $ADMIN_ID, period_secs=$PERIOD_SECS, max_pause_periods=$MAX_PAUSE_PERIODS)..."
deploy_once() {
  CONTRACT_ID="$(run_capture stellar contract deploy --wasm "$WASM" --optimize=false \
    --source-account "$ADMIN_ID" --network "$NETWORK" \
    -- --admin "$ADMIN_ADDR" --token "$TOKEN" --period_secs "$PERIOD_SECS" --max_pause_periods "$MAX_PAUSE_PERIODS" \
    | tail -n 1)" && [[ "$CONTRACT_ID" =~ ^C[A-Z2-7]{55}$ ]]
}
CONTRACT_ID=""
# Not retried: a deploy that half-succeeded would leave an orphan contract. If it fails, re-run the script.
deploy_once || die "deploy failed (a network/SendRequest error is usually transient: just re-run the script)"
say "deployed: $CONTRACT_ID"
say "  https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"

invoke_write() { run_capture stellar contract invoke --id "$CONTRACT_ID" --source-account "$ADMIN_ID" --network "$NETWORK" --send=yes -- "$@"; }
invoke_read()  { run_capture stellar contract invoke --id "$CONTRACT_ID" --source-account "$ADMIN_ID" --network "$NETWORK" --send=no  -- "$@"; }

# 4. add_creditor (signed by laya-admin) -------------------------------------------------------
# add_creditor only sets a flag, so retrying it is harmless. Same address twice (fallback mode) is fine too.
for who in "creditor:$CREDITOR" "clinic:$CLINIC"; do
  name="${who%%:*}"; address="${who#*:}"
  say "add_creditor $name ($address)..."
  retry invoke_write add_creditor --creditor "$address" >/dev/null || die "add_creditor failed for $name (usually transient: re-run the script)"
done

# 5. verify ----------------------------------------------------------------------------------------
say "verifying on chain..."
CONFIG_JSON=""; get_config() { CONFIG_JSON="$(invoke_read get_config)"; }
retry get_config || die "get_config failed"
say "get_config = $CONFIG_JSON"
IS_CREDITOR=""; is_creditor() { IS_CREDITOR="$(invoke_read is_creditor --creditor "$1" | tail -n 1)"; }
retry is_creditor "$CREDITOR" || die "is_creditor failed for creditor"
CREDITOR_OK="$IS_CREDITOR"
retry is_creditor "$CLINIC" || die "is_creditor failed for clinic"
CLINIC_OK="$IS_CREDITOR"
say "is_creditor(creditor) = $CREDITOR_OK"
say "is_creditor(clinic)   = $CLINIC_OK"

node -e '
  const [cfgJson, admin, token, period, maxp, cOk, kOk] = process.argv.slice(1);
  const c = JSON.parse(cfgJson);
  const bad = [];
  if (c.admin !== admin) bad.push("admin " + c.admin + " != " + admin);
  if (c.token !== token) bad.push("token " + c.token + " != " + token);
  if (String(c.period_secs) !== period) bad.push("period_secs " + c.period_secs + " != " + period);
  if (String(c.max_pause_periods) !== maxp) bad.push("max_pause_periods " + c.max_pause_periods + " != " + maxp);
  if (cOk !== "true") bad.push("is_creditor(creditor) = " + cOk);
  if (kOk !== "true") bad.push("is_creditor(clinic) = " + kOk);
  if (bad.length) { console.error("[deploy] ERROR: verification failed: " + bad.join("; ")); process.exit(1); }
' "$CONFIG_JSON" "$ADMIN_ADDR" "$TOKEN" "$PERIOD_SECS" "$MAX_PAUSE_PERIODS" "$CREDITOR_OK" "$CLINIC_OK" || exit 1
say "verification passed: config matches and both providers are registered"

# 6. testnet.json ----------------------------------------------------------------------------------
# Only contractId and deployedAt change. Written through a temp file, then renamed over the original.
DEPLOYED_AT="$(node -e 'console.log(new Date().toISOString())')"
RESULT="$(node -e '
  const fs = require("fs");
  const [file, contractId, deployedAt] = process.argv.slice(1);
  const raw = fs.readFileSync(file, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const hadFinalNewline = /\n$/.test(raw);
  const before = JSON.parse(raw);
  const after = { ...before, contractId, deployedAt };
  for (const k of Object.keys(before)) {
    if (k !== "contractId" && k !== "deployedAt" && JSON.stringify(before[k]) !== JSON.stringify(after[k])) throw new Error("unexpected change in " + k);
  }
  let out = JSON.stringify(after, null, 2);
  if (hadFinalNewline) out += "\n";
  out = out.replace(/\r?\n/g, eol);
  JSON.parse(out); // must still be valid JSON
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, out);
  fs.renameSync(tmp, file);
  console.log("contractId: " + before.contractId + " -> " + contractId);
  console.log("deployedAt: " + before.deployedAt + " -> " + deployedAt);
' "$CONFIG" "$CONTRACT_ID" "$DEPLOYED_AT" | tr -d '\r')" || die "could not update testnet.json"
while IFS= read -r line; do say "testnet.json  $line"; done <<< "$RESULT"

# 7. TypeScript bindings -----------------------------------------------------------------------------
# Generated by the JS SDK's generator (the Stellar CLI's `contract bindings typescript` is deprecated).
say "generating TypeScript bindings into packages/laya-bindings (@stellar/stellar-sdk@$BINDINGS_SDK_VERSION)..."
gen_bindings() {
  run_capture npx --yes "@stellar/stellar-sdk@$BINDINGS_SDK_VERSION" generate \
    --contract-id "$CONTRACT_ID" --network "$NETWORK" --output-dir "$BINDINGS_DIR" --overwrite >/dev/null
}
retry gen_bindings || die "bindings generation failed (usually transient: re-run the script)"
say "bindings written to $BINDINGS_DIR"

# The generator names the package "contract" and points main/types at dist/ (never built).
# Patch exactly three fields so the app can use the TypeScript source directly (no build step).
PATCH_RESULT="$(node -e '
  const fs = require("fs");
  const file = process.argv[1];
  const raw = fs.readFileSync(file, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const hadFinalNewline = /\n$/.test(raw);
  const pkg = JSON.parse(raw);
  pkg.name = "laya-bindings";
  pkg.main = "src/index.ts";
  pkg.types = "src/index.ts";
  let out = JSON.stringify(pkg, null, 2);
  if (hadFinalNewline) out += "\n";
  out = out.replace(/\r?\n/g, eol);
  JSON.parse(out); // must still be valid JSON
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, out);
  fs.renameSync(tmp, file);
  console.log("name=" + pkg.name + " main=" + pkg.main + " types=" + pkg.types);
' "$BINDINGS_DIR/package.json" | tr -d '\r')" || die "could not patch packages/laya-bindings/package.json"
say "package.json patched: $PATCH_RESULT"

echo
say "DONE. What changed:"
say "  new contract:   $CONTRACT_ID   (previous in testnet.json: $OLD_CONTRACT)"
say "  testnet.json:   contractId and deployedAt updated, nothing else"
say "  bindings:       packages/laya-bindings regenerated for the new contract (package.json: name laya-bindings, main/types -> src/index.ts)"
say "Next: git status, then tell Abdullah that testnet.json and the bindings are ready."
