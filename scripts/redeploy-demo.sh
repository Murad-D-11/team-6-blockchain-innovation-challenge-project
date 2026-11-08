#!/usr/bin/env bash
# Laya: a safe, repeatable FRESH demo deploy on Stellar TESTNET. Run it the evening before the showcase
# (Nov 16) and the finals (Nov 18), then run demo-reset.sh again an hour before judging.
#
#   0. refuses to run unless: git is clean, you are on main, and main equals origin/main
#      (it SHOWS what is wrong and stops; it never fixes anything: no checkout, pull, stash or reset)
#   1. records the current contractId from testnet.json
#   2. runs scripts/deploy.sh  (build, fresh contract, add_creditor x2, testnet.json, bindings)
#   3. verifies: new contractId is a contract id, differs from the old one, resolves on chain
#      (get_config matches testnet.json), and request_count is 0; bindings package.json is patched;
#      only the expected files changed
#   4. runs scripts/demo-reset.sh  (tops up balances, set_period(60, 3), token TTL)
#   5. prints PUBLIC keys and ids only, then the exact next steps for the team
#
# It does NOT commit, push, merge, or run the smoke test. Nothing here touches secret keys:
# they stay in the Stellar CLI keystore (laya-admin, laya-issuer).
# Needs: git, stellar CLI 30.x, node + npx. Run from anywhere:  bash scripts/redeploy-demo.sh
set -euo pipefail

unset STELLAR_NETWORK STELLAR_RPC_URL STELLAR_NETWORK_PASSPHRASE STELLAR_ACCOUNT \
      STELLAR_SIGN_WITH_KEY STELLAR_RPC_HEADERS STELLAR_CONTRACT_ID 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# pwd -W gives a Windows path under Git Bash (node can't read /c/...); plain pwd elsewhere.
ROOT="$(cd "$SCRIPT_DIR/.." && { pwd -W 2>/dev/null || pwd; })"
CONFIG="$ROOT/app/src/config/testnet.json"
BINDINGS_PKG="$ROOT/packages/laya-bindings/package.json"

NETWORK="testnet"
ADMIN_ID="laya-admin"

say() { echo "[redeploy] $*"; }
die() { echo "[redeploy] ERROR: $*" >&2; exit 1; }
redact() { sed -E 's/S[A-Z2-7]{55}/<redacted-secret>/g'; }

command -v git >/dev/null || die "git not found"
command -v stellar >/dev/null || die "stellar CLI not found"
command -v node >/dev/null || die "node not found"
[ -f "$CONFIG" ] || die "config not found: $CONFIG"
[ -f "$SCRIPT_DIR/deploy.sh" ] || die "scripts/deploy.sh not found"
[ -f "$SCRIPT_DIR/demo-reset.sh" ] || die "scripts/demo-reset.sh not found"

cfg() {
  node -e '
    const v = process.argv[2].split(".").reduce((o, k) => (o == null ? o : o[k]), JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")));
    if (v === undefined || v === null) { console.error("missing in testnet.json: " + process.argv[2]); process.exit(1); }
    console.log(v);
  ' "$CONFIG" "$1" | tr -d '\r'
}

ERRFILE="$(mktemp)"
trap 'rm -f "$ERRFILE"' EXIT
run_capture() {
  local out
  if ! out="$("$@" 2>"$ERRFILE")"; then
    echo "[redeploy] FAILED: $*" >&2
    { printf '%s\n' "$out"; cat "$ERRFILE"; } | redact >&2
    return 1
  fi
  printf '%s\n' "$out" | tr -d '\r'
}

retry() {
  local i
  for i in 1 2 3 4; do
    if "$@"; then return 0; fi
    [ "$i" = "4" ] || { say "  attempt $i failed, retrying in 4s..." >&2; sleep 4; }
  done
  return 1
}

# 0. git guard ---------------------------------------------------------------------------------------
# Collect every problem first so you see them all at once. Nothing is fixed for you.
# `git fetch origin main` only updates the remote-tracking ref origin/main; it does not touch your branch or files.
say "checking git state in $ROOT ..."
PROBLEMS=()

BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD | tr -d '\r')"
[ "$BRANCH" = "main" ] || PROBLEMS+=("you are on branch '$BRANCH', not main")

DIRTY="$(git -C "$ROOT" status --porcelain | tr -d '\r')"
if [ -n "$DIRTY" ]; then
  PROBLEMS+=("working tree is not clean (changed or untracked files):"$'\n'"$(printf '%s\n' "$DIRTY" | sed 's/^/        /')")
fi

if git -C "$ROOT" fetch --quiet origin main 2>"$ERRFILE"; then
  LOCAL="$(git -C "$ROOT" rev-parse HEAD | tr -d '\r')"
  REMOTE="$(git -C "$ROOT" rev-parse origin/main | tr -d '\r')"
  if [ "$BRANCH" = "main" ] && [ "$LOCAL" != "$REMOTE" ]; then
    COUNTS="$(git -C "$ROOT" rev-list --left-right --count HEAD...origin/main | tr -d '\r')"
    AHEAD="${COUNTS%%[[:space:]]*}"; BEHIND="${COUNTS##*[[:space:]]}"
    PROBLEMS+=("main is not equal to origin/main: $AHEAD commit(s) ahead (unpushed), $BEHIND commit(s) behind (not pulled)")
  fi
else
  PROBLEMS+=("could not fetch origin/main, so 'up to date' cannot be checked: $(tr -d '\r' <"$ERRFILE" | head -n 2 | tr '\n' ' ')")
fi

if [ "${#PROBLEMS[@]}" -gt 0 ]; then
  echo "[redeploy] REFUSING TO RUN. Fix these yourself, then re-run (nothing was changed):" >&2
  for p in "${PROBLEMS[@]}"; do echo "  - $p" >&2; done
  exit 1
fi
say "git OK: on main, clean, equal to origin/main ($(git -C "$ROOT" rev-parse --short HEAD | tr -d '\r'))"

# 1. remember the old contract -------------------------------------------------------------------------
OLD_CONTRACT="$(cfg contractId)"
say "old contractId = $OLD_CONTRACT"

# 2. deploy ----------------------------------------------------------------------------------------------
say "running scripts/deploy.sh (this deploys a NEW contract; it is not retried on purpose)..."
echo "----------------------------------------------------------------------"
if ! bash "$SCRIPT_DIR/deploy.sh"; then
  echo "----------------------------------------------------------------------" >&2
  echo "[redeploy] deploy.sh FAILED. State check before you do anything:" >&2
  echo "  git status; git diff app/src/config/testnet.json" >&2
  echo "  - testnet.json UNCHANGED: nothing is live for the team yet. Just re-run this script (an orphan" >&2
  echo "    contract may exist on testnet; it is harmless and unused)." >&2
  echo "  - testnet.json CHANGED (new contractId) but bindings failed: do NOT re-run this script (that makes" >&2
  echo "    yet another contract). Regenerate bindings only; see the last lines of deploy.sh output." >&2
  exit 1
fi
echo "----------------------------------------------------------------------"

# 3. verify ------------------------------------------------------------------------------------------------
NEW_CONTRACT="$(cfg contractId)"
TOKEN="$(cfg tokenContractId)"
ADMIN_ADDR="$(cfg accounts.admin)"
[[ "$NEW_CONTRACT" =~ ^C[A-Z2-7]{55}$ ]] || die "new contractId in testnet.json is not a contract id: $NEW_CONTRACT"
[ "$NEW_CONTRACT" != "$OLD_CONTRACT" ] || die "contractId did not change ($NEW_CONTRACT): deploy.sh did not write a new one"

CONFIG_JSON=""; read_config() { CONFIG_JSON="$(run_capture stellar contract invoke --id "$NEW_CONTRACT" --source-account "$ADMIN_ID" --network "$NETWORK" --send=no -- get_config)"; }
COUNT=""; read_count() { COUNT="$(run_capture stellar contract invoke --id "$NEW_CONTRACT" --source-account "$ADMIN_ID" --network "$NETWORK" --send=no -- request_count | tail -n 1 | tr -d '"')"; }
retry read_config || die "new contract does not resolve on chain (get_config failed): $NEW_CONTRACT"
retry read_count  || die "request_count failed on $NEW_CONTRACT"
[[ "$COUNT" =~ ^[0-9]+$ ]] || die "unexpected request_count output: $COUNT"
[ "$COUNT" = "0" ] || die "request_count is $COUNT, expected 0 on a fresh contract"

node -e '
  const [cfgJson, admin, token] = process.argv.slice(1);
  const c = JSON.parse(cfgJson); const bad = [];
  if (c.admin !== admin) bad.push("admin " + c.admin + " != " + admin);
  if (c.token !== token) bad.push("token " + c.token + " != " + token);
  if (String(c.period_secs) !== "60") bad.push("period_secs " + c.period_secs + " != 60");
  if (String(c.max_pause_periods) !== "3") bad.push("max_pause_periods " + c.max_pause_periods + " != 3");
  if (bad.length) { console.error("[redeploy] ERROR: new contract config mismatch: " + bad.join("; ")); process.exit(1); }
' "$CONFIG_JSON" "$ADMIN_ADDR" "$TOKEN" || exit 1

# Bindings hold no contract id (the app passes it at runtime); check the three patched package.json fields instead.
node -e '
  const p = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  if (p.name !== "laya-bindings" || p.main !== "src/index.ts" || p.types !== "src/index.ts") {
    console.error("[redeploy] ERROR: packages/laya-bindings/package.json not patched: name=" + p.name + " main=" + p.main + " types=" + p.types);
    process.exit(1);
  }
' "$BINDINGS_PKG" || exit 1
say "verified: new contract resolves, config matches, request_count = 0, bindings package.json patched"

# Only testnet.json and the bindings should differ from main now. Anything else is a surprise: warn loudly.
UNEXPECTED="$(git -C "$ROOT" status --porcelain | tr -d '\r' | grep -v -E ' (app/src/config/testnet\.json|packages/laya-bindings/)' || true)"
if [ -n "$UNEXPECTED" ]; then
  say "WARNING: files changed outside testnet.json and packages/laya-bindings. Review before committing:"
  printf '%s\n' "$UNEXPECTED" | sed 's/^/[redeploy]     /'
fi

# 4. demo-reset ----------------------------------------------------------------------------------------------
say "running scripts/demo-reset.sh against the NEW contract (reads contractId from testnet.json)..."
echo "----------------------------------------------------------------------"
if ! bash "$SCRIPT_DIR/demo-reset.sh"; then
  echo "----------------------------------------------------------------------" >&2
  echo "[redeploy] demo-reset.sh FAILED. The new contract and files are already in place; do NOT redeploy." >&2
  echo "  Just re-run:  bash scripts/demo-reset.sh   (safe: it only pays what is still missing)" >&2
  exit 1
fi
echo "----------------------------------------------------------------------"

# 5. summary + next steps ---------------------------------------------------------------------------------------
echo
say "DONE. Public ids only:"
say "  old contract : $OLD_CONTRACT   (its requests and loans are now orphaned; old /proof links will not resolve on the new contract)"
say "  new contract : $NEW_CONTRACT"
say "  token        : $TOKEN"
say "  explorer     : https://stellar.expert/explorer/testnet/contract/$NEW_CONTRACT"
say "  request_count: 0"
echo
say "NEXT STEPS (nothing below was done for you):"
cat <<EOF
  1. Review:   git status   (expect only app/src/config/testnet.json and packages/laya-bindings/)
  2. Commit testnet.json and packages/laya-bindings on a branch, open a PR, merge to main.
  3. Post in the team chat: "New contract $NEW_CONTRACT is live (request_count 0). testnet.json merged."
  4. Ping Abdullah to REDEPLOY VERCEL from the new main (the hosted app reads contractId at build time;
     until he does, Vercel still points at the old contract).
  5. In app/ run:  npm run smoke:real -- --reads   (read-only, no keys; the check for the night before the
     showcase and finals, together with the verification this script already did).
     Do NOT run the full "npm run smoke:real" now: it is for the REHEARSAL DAY (Nov 14 or 15) only, because it
     creates and funds requests with placeholder hashes and spends balances, and the requests stay on the contract.
  6. An hour before judging run:  bash scripts/demo-reset.sh   (it cannot erase requests)
  7. In the demo, create FRESH requests live on /worker/request.
EOF
