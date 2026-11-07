#!/usr/bin/env bash
# Laya: reset the demo accounts on Stellar TESTNET. Run it an hour before every demo and rehearsal. Safe to re-run.
#
#   1. checks that Horizon, the Soroban RPC and testnet.json all say TESTNET (stops otherwise)
#   2. reads accounts, asset, tokenContractId and contractId from app/src/config/testnet.json
#   3. reads the USDC token balance of worker, funder and employer
#   4. tops each up to its target (worker 2,000 / funder 10,000 / employer 10,000 USDC) by paying ONLY the
#      shortfall from laya-issuer. An account at or above target is left alone (money is never taken back)
#   5. calls set_period(60, 3) as laya-admin
#   6. prints balances before and after, and the contract config after
#
# It cannot erase requests or loans already on the contract (the contract has no delete). Demos must
# create fresh requests live, because old loans show many missed periods once a "month" is 60 seconds.
#
# Secret keys stay in the Stellar CLI keystore. This script prints PUBLIC keys and ids only.
# Needs: stellar CLI 30.x, node. Run from anywhere:  bash scripts/demo-reset.sh
set -euo pipefail

# Env vars that could silently point the CLI somewhere else.
unset STELLAR_NETWORK STELLAR_RPC_URL STELLAR_NETWORK_PASSPHRASE STELLAR_ACCOUNT \
      STELLAR_SIGN_WITH_KEY STELLAR_RPC_HEADERS STELLAR_CONTRACT_ID 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# pwd -W gives a Windows path under Git Bash (node can't read /c/...); plain pwd elsewhere.
ROOT="$(cd "$SCRIPT_DIR/.." && { pwd -W 2>/dev/null || pwd; })"
CONFIG="$ROOT/app/src/config/testnet.json"

NETWORK="testnet"
TESTNET_PASSPHRASE="Test SDF Network ; September 2015"
HORIZON="https://horizon-testnet.stellar.org"
RPC="https://soroban-testnet.stellar.org"
ADMIN_ID="laya-admin"
ISSUER_ID="laya-issuer"
PERIOD_SECS=60
MAX_PAUSE_PERIODS=3

# Targets in stroops (7 decimals): 2,000 / 10,000 / 10,000 USDC.
WORKER_TARGET=20000000000
FUNDER_TARGET=100000000000
EMPLOYER_TARGET=100000000000

say() { echo "[reset] $*"; }
die() { echo "[reset] ERROR: $*" >&2; exit 1; }
redact() { sed -E 's/S[A-Z2-7]{55}/<redacted-secret>/g'; }

command -v stellar >/dev/null || die "stellar CLI not found"
command -v node >/dev/null || die "node not found"
[ -f "$CONFIG" ] || die "config not found: $CONFIG"

# Read one field from testnet.json (dot path, e.g. accounts.worker).
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
    echo "[reset] FAILED: $*" >&2
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

# Poll a condition every 2 seconds for up to 40 seconds (RPC lags a ledger or two).
wait_for() {
  local what="$1" i; shift
  for i in $(seq 1 20); do
    if "$@"; then return 0; fi
    sleep 2
  done
  die "timed out waiting for: $what"
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
  })().catch((e) => { console.error("[reset] ERROR: " + e.message); process.exit(1); });
' "$HORIZON" "$RPC" "$CONFIG" "$TESTNET_PASSPHRASE" || exit 1
say "network check: Horizon, Soroban RPC and testnet.json are all TESTNET"

# 2. inputs (all public values) ------------------------------------------------------------------
TOKEN="$(cfg tokenContractId)"
CONTRACT="$(cfg contractId)"
ASSET="$(cfg asset.code):$(cfg asset.issuer)"
ADMIN_ADDR="$(cfg accounts.admin)"
ISSUER_ADDR="$(cfg accounts.issuer)"
WORKER="$(cfg accounts.worker)"
FUNDER="$(cfg accounts.funder)"
EMPLOYER="$(cfg accounts.employer)"
[[ "$TOKEN" =~ ^C[A-Z2-7]{55}$ ]] || die "tokenContractId in testnet.json is not a contract id: $TOKEN"
[[ "$CONTRACT" =~ ^C[A-Z2-7]{55}$ ]] || die "contractId in testnet.json is not a contract id: $CONTRACT"
for a in "$ADMIN_ADDR" "$ISSUER_ADDR" "$WORKER" "$FUNDER" "$EMPLOYER"; do
  [[ "$a" =~ ^G[A-Z2-7]{55}$ ]] || die "testnet.json has an invalid account address: $a"
done
[ "$ISSUER_ADDR" = "$(cfg asset.issuer)" ] || die "accounts.issuer does not match asset.issuer in testnet.json"

# The keystore identities must be the accounts testnet.json names, or we would sign as someone else.
[ "$(stellar keys address "$ADMIN_ID" | tr -d '\r')" = "$ADMIN_ADDR" ] \
  || die "keystore $ADMIN_ID does not match testnet.json accounts.admin"
[ "$(stellar keys address "$ISSUER_ID" | tr -d '\r')" = "$ISSUER_ADDR" ] \
  || die "keystore $ISSUER_ID does not match testnet.json accounts.issuer"

say "contract = $CONTRACT"
say "token    = $TOKEN"
say "asset    = $ASSET"

# 3. helpers -------------------------------------------------------------------------------------
# Read-only calls only (--send=no simulates and never submits).
token_balance() {
  local out
  out="$(run_capture stellar contract invoke --id "$TOKEN" --source-account "$ADMIN_ID" --network "$NETWORK" \
    --send=no -- balance --id "$1" | tail -n 1 | tr -d '"')" || return 1
  [[ "$out" =~ ^-?[0-9]+$ ]] || { echo "[reset] unexpected balance output for $1: $out" >&2; return 1; }
  echo "$out"
}
BAL=""
read_balance() { BAL="$(token_balance "$1")"; }
get_balance()  { retry read_balance "$1" || die "could not read the token balance of $1"; }

fmt() { node -e '
  const v = BigInt(process.argv[1]); const neg = v < 0n; const a = neg ? -v : v;
  const w = (a / 10000000n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  console.log((neg ? "-" : "") + w + "." + (a % 10000000n).toString().padStart(7, "0").slice(0, 2) + " USDC");
' "$1" | tr -d '\r'; }

balance_at_least() { read_balance "$1" 2>/dev/null && node -e 'process.exit(BigInt(process.argv[1]) >= BigInt(process.argv[2]) ? 0 : 1)' "$BAL" "$2"; }

CONFIG_JSON=""
read_config() { CONFIG_JSON="$(run_capture stellar contract invoke --id "$CONTRACT" --source-account "$ADMIN_ID" --network "$NETWORK" --send=no -- get_config)"; }

# 4. balances before ------------------------------------------------------------------------------
get_balance "$WORKER";   W_BEFORE="$BAL"
get_balance "$FUNDER";   F_BEFORE="$BAL"
get_balance "$EMPLOYER"; E_BEFORE="$BAL"
echo
say "balances BEFORE:"
say "  worker   $(fmt "$W_BEFORE")   (target $(fmt "$WORKER_TARGET"))"
say "  funder   $(fmt "$F_BEFORE")   (target $(fmt "$FUNDER_TARGET"))"
say "  employer $(fmt "$E_BEFORE")   (target $(fmt "$EMPLOYER_TARGET"))"
echo

# 5. top up: pay only the shortfall from the issuer; never take money back ------------------------------
# A payment is NOT retried blindly: a failed call may have landed with only the response lost.
# So before every attempt (including the first) the balance is re-read and the shortfall recomputed,
# and after a failed attempt we wait a few ledgers first so the re-read sees the landed payment.
top_up() {
  local name="$1" dest="$2" target="$3" bal="$4" diff attempt paid=0
  for attempt in 1 2 3 4; do
    if [ "$attempt" = "1" ]; then
      :  # the caller just read this balance; use it
    else
      say "  re-reading $name balance before attempt $attempt (the earlier payment may have landed)..." >&2
      get_balance "$dest"; bal="$BAL"
    fi
    diff="$(node -e 'console.log((BigInt(process.argv[1]) - BigInt(process.argv[2])).toString())' "$target" "$bal" | tr -d '\r')"
    if [ "${diff#-}" != "$diff" ] || [ "$diff" = "0" ]; then
      if [ "$paid" = "1" ]; then
        say "pay $name: balance reached target (an earlier attempt landed)"
      else
        say "pay $name: already at or above target, nothing to pay"
      fi
      return 0
    fi
    if run_capture stellar tx new payment --source-account "$ISSUER_ID" --destination "$dest" \
         --asset "$ASSET" --amount "$diff" --network "$NETWORK" >/dev/null; then
      wait_for "$name balance to reach $target" balance_at_least "$dest" "$target"
      say "pay $name: sent $(fmt "$diff") ($diff stroops)"
      return 0
    fi
    paid=1
    [ "$attempt" = "4" ] || { say "  payment attempt $attempt failed, waiting 8s then re-checking the balance..." >&2; sleep 8; }
  done
  die "payment to $name failed after 4 attempts (re-run the script, it only pays what is still missing)"
}
top_up worker   "$WORKER"   "$WORKER_TARGET"   "$W_BEFORE"
top_up funder   "$FUNDER"   "$FUNDER_TARGET"   "$F_BEFORE"
top_up employer "$EMPLOYER" "$EMPLOYER_TARGET" "$E_BEFORE"

# 6. set_period(60, 3) as laya-admin -------------------------------------------------------------------
# Safe to repeat: it overwrites the same two numbers.
set_period() {
  run_capture stellar contract invoke --id "$CONTRACT" --source-account "$ADMIN_ID" --network "$NETWORK" --send=yes \
    -- set_period --period_secs "$PERIOD_SECS" --max_pause_periods "$MAX_PAUSE_PERIODS" >/dev/null
}
echo
say "set_period($PERIOD_SECS, $MAX_PAUSE_PERIODS) as $ADMIN_ID..."
retry set_period || die "set_period failed (usually transient: re-run the script)"

# 7. balances and config after --------------------------------------------------------------------------
get_balance "$WORKER";   W_AFTER="$BAL"
get_balance "$FUNDER";   F_AFTER="$BAL"
get_balance "$EMPLOYER"; E_AFTER="$BAL"
retry read_config || die "get_config failed"

echo
say "balances AFTER:"
say "  worker   $(fmt "$W_AFTER")"
say "  funder   $(fmt "$F_AFTER")"
say "  employer $(fmt "$E_AFTER")"
say "get_config = $CONFIG_JSON"

node -e '
  const [cfgJson, period, maxp, w, f, e, wt, ft, et] = process.argv.slice(1);
  const c = JSON.parse(cfgJson);
  const bad = [];
  if (String(c.period_secs) !== period) bad.push("period_secs " + c.period_secs + " != " + period);
  if (String(c.max_pause_periods) !== maxp) bad.push("max_pause_periods " + c.max_pause_periods + " != " + maxp);
  if (BigInt(w) < BigInt(wt)) bad.push("worker below target");
  if (BigInt(f) < BigInt(ft)) bad.push("funder below target");
  if (BigInt(e) < BigInt(et)) bad.push("employer below target");
  if (bad.length) { console.error("[reset] ERROR: verification failed: " + bad.join("; ")); process.exit(1); }
' "$CONFIG_JSON" "$PERIOD_SECS" "$MAX_PAUSE_PERIODS" "$W_AFTER" "$F_AFTER" "$E_AFTER" \
  "$WORKER_TARGET" "$FUNDER_TARGET" "$EMPLOYER_TARGET" || exit 1

echo
say "DONE. Balances are at or above target and the period is $PERIOD_SECS s with $MAX_PAUSE_PERIODS pause periods."
say "REMINDER: old requests and loans stay on the contract. Create fresh requests live in every demo."
