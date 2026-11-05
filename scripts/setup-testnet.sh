#!/usr/bin/env bash
# Laya H2 (v2): testnet accounts, test USDC and the USDC token contract. Idempotent.
#
#   1. checks that everything points at Stellar TESTNET (stops otherwise)
#   2. creates 8 Stellar CLI identities named laya-<role> and friendbot-funds any that are not on the network
#   3. adds USDC:<issuer> trustlines for worker, family, funder, creditor, clinic, employer
#   4. deploys the USDC Stellar Asset Contract (or finds its contract id if it already exists)
#   5. pays worker 2,000, funder 10,000 and employer 10,000 test USDC from the issuer (only the difference)
#   6. writes accounts, asset.code, asset.issuer and tokenContractId into app/src/config/testnet.json
#
# Secret keys stay in the Stellar CLI keystore. This script prints and writes PUBLIC keys only.
# Needs: stellar CLI 30.x, node. Run from anywhere:  bash scripts/setup-testnet.sh
#
# Fallback (only when asked): LAYA_SKIP_CLINIC=1 bash scripts/setup-testnet.sh
#   seven accounts; no clinic identity is created and the creditor address is also written as
#   accounts.clinic, so the creditor account serves both bills (PLAN-v2.md "Decisions" item 1).
set -euo pipefail

# Env vars that could silently point the CLI somewhere else.
unset STELLAR_NETWORK STELLAR_RPC_URL STELLAR_NETWORK_PASSPHRASE STELLAR_ACCOUNT \
      STELLAR_SIGN_WITH_KEY STELLAR_RPC_HEADERS 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# pwd -W gives a Windows path under Git Bash (node can't read /c/...); plain pwd elsewhere.
ROOT="$(cd "$SCRIPT_DIR/.." && { pwd -W 2>/dev/null || pwd; })"
CONFIG="$ROOT/app/src/config/testnet.json"

NETWORK="testnet"
TESTNET_PASSPHRASE="Test SDF Network ; September 2015"
HORIZON="https://horizon-testnet.stellar.org"
RPC="https://soroban-testnet.stellar.org"
ASSET_CODE="USDC"
PREFIX="laya-"

# Targets in stroops (7 decimals): 2,000 / 10,000 / 10,000 USDC.
WORKER_TARGET=20000000000
FUNDER_TARGET=100000000000
EMPLOYER_TARGET=100000000000

SKIP_CLINIC="${LAYA_SKIP_CLINIC:-0}"
if [ "$SKIP_CLINIC" = "1" ]; then
  NAMES="admin issuer worker family funder creditor employer"
  TRUST_NAMES="worker family funder creditor employer"
else
  NAMES="admin issuer worker family funder creditor clinic employer"
  TRUST_NAMES="worker family funder creditor clinic employer"
fi

say() { echo "[setup] $*"; }
die() { echo "[setup] ERROR: $*" >&2; exit 1; }

command -v stellar >/dev/null || die "stellar CLI not found"
command -v node >/dev/null || die "node not found"
[ -f "$CONFIG" ] || die "config not found: $CONFIG"

# Run a command quietly; on failure print its output (secret keys redacted) and stop.
run() {
  local out
  if ! out="$("$@" 2>&1)"; then
    echo "[setup] FAILED: $*" >&2
    printf '%s\n' "$out" | sed -E 's/S[A-Z2-7]{55}/<redacted-secret>/g' >&2
    exit 1
  fi
}

addr() { stellar keys address "$PREFIX$1" | tr -d '\r'; }

# Poll a condition every 2 seconds for up to 40 seconds (Horizon lags a ledger or two).
wait_for() {
  local what="$1" i; shift
  for i in $(seq 1 20); do
    if "$@"; then return 0; fi
    sleep 2
  done
  die "timed out waiting for: $what"
}

# 0. network guard -----------------------------------------------------------------------------
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
  })().catch((e) => { console.error("[setup] ERROR: " + e.message); process.exit(1); });
' "$HORIZON" "$RPC" "$CONFIG" "$TESTNET_PASSPHRASE" || exit 1
say "network check: Horizon, Soroban RPC and testnet.json are all TESTNET"
if [ "$SKIP_CLINIC" = "1" ]; then
  say "!!! FALLBACK MODE: LAYA_SKIP_CLINIC=1. No clinic account will be created."
  say "!!! The creditor address will also be written as accounts.clinic (seven real accounts)."
fi

# Prints "MISSING" on 404, else "<xlm>|<usdc or NONE>" as stroop integers.  Usage: acct_state <G...> <issuer>
acct_state() {
  node -e '
    const [addr, code, issuer, horizon] = process.argv.slice(1);
    const toStroops = (s) => { const [w, f = ""] = s.split("."); return BigInt(w + f.padEnd(7, "0").slice(0, 7)); };
    (async () => {
      for (let i = 0; i < 5; i++) {
        try {
          const r = await fetch(horizon + "/accounts/" + addr);
          if (r.status === 404) { console.log("MISSING"); return; }
          if (!r.ok) throw new Error("HTTP " + r.status);
          const j = await r.json();
          let xlm = "0", usdc = "NONE";
          for (const b of j.balances) {
            if (b.asset_type === "native") xlm = toStroops(b.balance).toString();
            else if (b.asset_code === code && b.asset_issuer === issuer) usdc = toStroops(b.balance).toString();
          }
          console.log(xlm + "|" + usdc);
          return;
        } catch (e) {
          if (i === 4) { console.error("Horizon error: " + e.message); process.exit(1); }
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        }
      }
    })();
  ' "$1" "$ASSET_CODE" "${2:-}" "$HORIZON" | tr -d '\r'
}

# 1. identities --------------------------------------------------------------------------------
for n in $NAMES; do
  if stellar keys address "$PREFIX$n" >/dev/null 2>&1; then
    say "identity $PREFIX$n: exists, reusing it"
  else
    run stellar keys generate "$PREFIX$n"
    say "identity $PREFIX$n: created"
  fi
done

ISSUER="$(addr issuer)"
ASSET="$ASSET_CODE:$ISSUER"
for n in $NAMES; do
  a="$(addr "$n")"
  [[ "$a" =~ ^G[A-Z2-7]{55}$ ]] || die "identity $PREFIX$n did not give a valid public key"
done

# 2. friendbot funding (only accounts missing on the network) -----------------------------------
has_account() { [ "$(acct_state "$1" "$ISSUER")" != "MISSING" ]; }
for n in $NAMES; do
  a="$(addr "$n")"
  if has_account "$a"; then
    say "fund $PREFIX$n: account already on testnet ($a)"
  else
    say "fund $PREFIX$n: asking friendbot ($a)"
    ok=0
    for try in 1 2 3; do
      if stellar keys fund "$PREFIX$n" --network "$NETWORK" >/dev/null 2>&1; then ok=1; break; fi
      sleep 3
    done
    [ "$ok" = "1" ] || die "friendbot failed for $PREFIX$n after 3 tries"
    wait_for "account $PREFIX$n to appear on Horizon" has_account "$a"
    say "fund $PREFIX$n: funded"
  fi
done

# 3. trustlines ---------------------------------------------------------------------------------
has_trustline() { local s; s="$(acct_state "$1" "$ISSUER")"; [ "$s" != "MISSING" ] && [ "${s#*|}" != "NONE" ]; }
for n in $TRUST_NAMES; do
  a="$(addr "$n")"
  if has_trustline "$a"; then
    say "trustline $PREFIX$n: already has $ASSET_CODE"
  else
    run stellar tx new change-trust --source-account "$PREFIX$n" --line "$ASSET" --network "$NETWORK"
    wait_for "trustline for $PREFIX$n" has_trustline "$a"
    say "trustline $PREFIX$n: added $ASSET_CODE"
  fi
done

# 4. Stellar Asset Contract ---------------------------------------------------------------------
TOKEN="$(stellar contract id asset --asset "$ASSET" --network "$NETWORK" | tr -d '\r')"
[[ "$TOKEN" =~ ^C[A-Z2-7]{55}$ ]] || die "could not derive the token contract id (got: $TOKEN)"
token_exists() { stellar contract info interface --contract-id "$TOKEN" --network "$NETWORK" >/dev/null 2>&1; }
if token_exists; then
  say "token contract: already deployed ($TOKEN)"
else
  run stellar contract asset deploy --asset "$ASSET" --source-account "${PREFIX}admin" --network "$NETWORK"
  wait_for "token contract $TOKEN" token_exists
  say "token contract: deployed ($TOKEN)"
fi

# 5. pay from the issuer: only the difference up to the target -----------------------------------
balance_at_least() {
  local s b; s="$(acct_state "$1" "$ISSUER")"; b="${s#*|}"
  [ "$s" != "MISSING" ] && [ "$b" != "NONE" ] && \
    node -e 'process.exit(BigInt(process.argv[1]) >= BigInt(process.argv[2]) ? 0 : 1)' "$b" "$2"
}
top_up() {
  local name="$1" dest="$2" target="$3" state bal diff
  state="$(acct_state "$dest" "$ISSUER")"
  bal="${state#*|}"
  [ "$state" != "MISSING" ] && [ "$bal" != "NONE" ] || die "$name has no $ASSET_CODE trustline"
  diff="$(node -e 'console.log((BigInt(process.argv[1]) - BigInt(process.argv[2])).toString())' "$target" "$bal")"
  if [ "${diff#-}" = "$diff" ] && [ "$diff" != "0" ]; then
    run stellar tx new payment --source-account "${PREFIX}issuer" --destination "$dest" \
      --asset "$ASSET" --amount "$diff" --network "$NETWORK"
    wait_for "$name balance to reach $target" balance_at_least "$dest" "$target"
    say "pay $name: sent $diff stroops (balance was $bal, target $target)"
  else
    say "pay $name: balance $bal is already at or above target $target, nothing to pay"
  fi
}
top_up worker   "$(addr worker)"   "$WORKER_TARGET"
top_up funder   "$(addr funder)"   "$FUNDER_TARGET"
top_up employer "$(addr employer)" "$EMPLOYER_TARGET"
say "pay family, creditor, clinic: start at 0, nothing to pay"

# 6. testnet.json ---------------------------------------------------------------------------------
# Replaces all eight accounts together plus asset.code, asset.issuer and tokenContractId.
# Every other field (contractId, deployedAt, rpcUrl, ...) is left exactly as it is.
if [ "$SKIP_CLINIC" = "1" ]; then CLINIC="$(addr creditor)"; else CLINIC="$(addr clinic)"; fi
RESULT="$(node -e '
  const fs = require("fs");
  const [file, admin, issuer, worker, family, funder, creditor, clinic, employer, code, token] = process.argv.slice(1);
  const raw = fs.readFileSync(file, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const hadFinalNewline = /\n$/.test(raw);
  const cfg = JSON.parse(raw);
  const keep = { contractId: cfg.contractId, deployedAt: cfg.deployedAt };
  cfg.accounts = { admin, issuer, worker, family, funder, creditor, clinic, employer };
  cfg.asset = { ...cfg.asset, code, issuer };
  cfg.tokenContractId = token;
  if (cfg.contractId !== keep.contractId || cfg.deployedAt !== keep.deployedAt) throw new Error("contractId/deployedAt changed");
  let out = JSON.stringify(cfg, null, 2);
  if (hadFinalNewline) out += "\n";
  out = out.replace(/\r?\n/g, eol);
  JSON.parse(out); // must still be valid JSON
  if (out === raw) { console.log("unchanged"); } else {
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, out);
    fs.renameSync(tmp, file);
    console.log("updated");
  }
' "$CONFIG" "$(addr admin)" "$ISSUER" "$(addr worker)" "$(addr family)" "$(addr funder)" \
  "$(addr creditor)" "$CLINIC" "$(addr employer)" "$ASSET_CODE" "$TOKEN" | tr -d '\r')"
say "testnet.json: $RESULT"

echo
say "done. Public keys (secret keys stay in the Stellar CLI keystore):"
for n in $NAMES; do say "  $n = $(addr "$n")"; done
if [ "$SKIP_CLINIC" = "1" ]; then
  say "  clinic = $CLINIC   <-- FALLBACK: same address as creditor"
  say "!!! FALLBACK MODE was used: seven accounts. Tell the team in the group chat."
fi
say "  asset = $ASSET"
say "  tokenContractId = $TOKEN"
