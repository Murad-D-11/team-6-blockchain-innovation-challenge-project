#!/usr/bin/env bash
# Laya H2: testnet accounts, test USDC and token contract. Idempotent.
#   - creates 6 stellar CLI identities (keys stay in the CLI identity store, never in the repo)
#   - friendbot-funds any account that does not exist on the network
#   - USDC trustlines for worker, family, funder, creditor
#   - deploys the USDC Stellar Asset Contract
#   - tops worker up to 2,000 and funder up to 10,000 test USDC (pays only the difference)
#   - writes accounts, asset and tokenContractId into app/src/config/testnet.json
# Needs: stellar CLI, node (no jq).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# pwd -W gives a Windows path under Git Bash (node can't read /c/...); plain pwd elsewhere.
ROOT="$(cd "$SCRIPT_DIR/.." && { pwd -W 2>/dev/null || pwd; })"
CONFIG="$ROOT/app/src/config/testnet.json"

NETWORK="testnet"
HORIZON="https://horizon-testnet.stellar.org"
ASSET_CODE="USDC"

# Targets in stroops (7 decimals). 2,000 USDC and 10,000 USDC.
WORKER_TARGET=20000000000
FUNDER_TARGET=100000000000

command -v stellar >/dev/null || { echo "stellar CLI not found" >&2; exit 1; }
command -v node >/dev/null || { echo "node not found" >&2; exit 1; }

say() { echo "[setup] $*"; }

# Strip CR (Windows CLI output) from command substitutions.
addr() { stellar keys address "$1" | tr -d '\r'; }

# Prints "MISSING" on 404, else "<xlm>|<usdc balance or NONE>" with balances as stroop integers.
# Usage: acct_state <G-address> <issuer>
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

# 1. identities ------------------------------------------------------------------------
NAMES="admin issuer worker family funder creditor"
for n in $NAMES; do
  if stellar keys address "$n" >/dev/null 2>&1; then
    say "identity $n: exists, keeping it"
  else
    stellar keys generate "$n" >/dev/null 2>&1
    say "identity $n: created"
  fi
done

ADMIN="$(addr admin)"; ISSUER="$(addr issuer)"; WORKER="$(addr worker)"
FAMILY="$(addr family)"; FUNDER="$(addr funder)"; CREDITOR="$(addr creditor)"
ASSET="$ASSET_CODE:$ISSUER"

# 2. friendbot funding (only accounts missing on the network) ----------------------------
for n in $NAMES; do
  a="$(addr "$n")"
  if [ "$(acct_state "$a" "$ISSUER")" = "MISSING" ]; then
    say "fund $n: not on $NETWORK, asking friendbot"
    stellar keys fund "$n" --network "$NETWORK" >/dev/null 2>&1
    say "fund $n: funded"
  else
    say "fund $n: account exists"
  fi
done

# 3. trustlines (worker, family, funder, creditor) ---------------------------------------
for n in worker family funder creditor; do
  a="$(addr "$n")"
  state="$(acct_state "$a" "$ISSUER")"
  if [ "${state#*|}" = "NONE" ]; then
    stellar tx new change-trust --source-account "$n" --line "$ASSET" --network "$NETWORK" >/dev/null 2>&1
    say "trustline $n: added $ASSET"
  else
    say "trustline $n: already present"
  fi
done

# 4. Stellar Asset Contract ----------------------------------------------------------------
TOKEN="$(stellar contract id asset --asset "$ASSET" --network "$NETWORK" | tr -d '\r')"
# The id is deterministic; deploy only if the contract is not on the network yet.
if stellar contract info interface --contract-id "$TOKEN" --network "$NETWORK" >/dev/null 2>&1; then
  say "token contract: already deployed ($TOKEN)"
else
  stellar contract asset deploy --asset "$ASSET" --source-account admin --network "$NETWORK" >/dev/null 2>&1
  say "token contract: deployed ($TOKEN)"
fi

# 5. pay from issuer, only the difference up to target ------------------------------------
top_up() {
  local name="$1" dest="$2" target="$3" state bal diff
  state="$(acct_state "$dest" "$ISSUER")"
  bal="${state#*|}"
  diff="$(node -e 'console.log((BigInt(process.argv[1]) - BigInt(process.argv[2])).toString())' "$target" "$bal")"
  if [ "${diff#-}" = "$diff" ] && [ "$diff" != "0" ]; then
    stellar tx new payment --source-account issuer --destination "$dest" --asset "$ASSET" \
      --amount "$diff" --network "$NETWORK" >/dev/null 2>&1
    say "pay $name: sent $diff stroops (balance was $bal, target $target)"
  else
    say "pay $name: balance $bal already at or above target $target, nothing to pay"
  fi
}
top_up worker "$WORKER" "$WORKER_TARGET"
top_up funder "$FUNDER" "$FUNDER_TARGET"
say "pay family, creditor: start at 0, nothing to pay"

# 6. testnet.json ---------------------------------------------------------------------------
# Only accounts, asset and tokenContractId change; key order, indent and EOL are preserved.
RESULT="$(node -e '
  const fs = require("fs");
  const [file, admin, issuer, worker, family, funder, creditor, code, token] = process.argv.slice(1);
  const raw = fs.readFileSync(file, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const hadFinalNewline = /\n$/.test(raw);
  const cfg = JSON.parse(raw);
  cfg.accounts = { admin, issuer, worker, family, funder, creditor };
  cfg.asset = { code, issuer };
  cfg.tokenContractId = token;
  let out = JSON.stringify(cfg, null, 2);
  if (hadFinalNewline) out += "\n";
  out = out.replace(/\r?\n/g, eol);
  if (out === raw) { console.log("unchanged"); } else { fs.writeFileSync(file, out); console.log("updated"); }
' "$CONFIG" "$ADMIN" "$ISSUER" "$WORKER" "$FAMILY" "$FUNDER" "$CREDITOR" "$ASSET_CODE" "$TOKEN" | tr -d '\r')"
say "testnet.json: $RESULT"

say "done. tokenContractId = $TOKEN"
