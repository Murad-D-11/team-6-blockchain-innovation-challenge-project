# Laya — rules for every Claude Code session in this repo

Laya is a 4-person hackathon project (Velocity "Blockchain Innovation Challenge powered by Stellar", Nov 2026) on **Stellar testnet**. It pays off a migrant worker's recruitment debt at its legal value (principal + 8%/yr simple interest), with the old lender's on-chain acceptance. The worker then repays a fair funder with a share of each remittance sent through Laya.

## Source of truth

`docs/SPEC.md` (plan v1.1) is the spec. The sections **"Shared contract A"** (Soroban contract) and **"Shared contract B"** (app types, `LayaClient`, config, file ownership) are fixed. Read them before writing code.

## Rules

1. Only edit files owned by the person you're working for (see the table). Never edit another owner's files. If a change is needed there, say so and stop.
2. Use the exact names, field names, units and error codes from the spec. Don't rename, "improve" or add fields to shared types or interfaces.
3. If the spec is ambiguous or something is missing, stop and ask. Don't guess.
4. Changing a Shared contract section needs the owner's agreement, a post in the group chat, and a new version number in the plan doc.
5. Testnet only. Fictional people and documents only. Never commit secret keys: they live in `.env.local`, which is git-ignored.
6. Pages never import `@stellar/*` packages. They call Stellar only through `useLaya()` (the `LayaClient` interface) and the helpers in `app/src/lib`.

## Owners

| Path | Owner |
| --- | --- |
| `contracts/laya/`, `packages/laya-bindings/`, `scripts/*.sh`, `app/src/config/testnet.json` | Murad |
| `app/src/lib/**`, `app/scripts/smoke.ts`, `app/src/app/dev/`, `app/src/app/page.tsx`, app setup files (`package.json`, configs) | Abdullah |
| `app/src/components/**`, `app/src/app/worker/**`, `app/src/app/family/**` | Ananya |
| `app/src/app/funder/**`, `creditor/**`, `proof/[id]/**`, `admin/**`, `app/src/data/**`, `app/public/samples/**` | Luke |

Need a new npm package? Ask Abdullah, since he owns `package.json`.

## Stellar knowledge

Before writing or debugging Stellar code (SDK calls, Soroban, Freighter, Horizon, CLI), use the installed Stellar skill and the Raven MCP server, if they're connected, to check current APIs. Don't rely on memory: Protocol 30 changed SDK versions and address types. Use them to answer questions, not to redesign. The spec decides what we build. Don't add new libraries or features they suggest (passkeys, relayers, oracles, OpenZeppelin contracts) without the team agreeing.

## Amounts and units

All token amounts are `bigint` with 7 decimals (1 USDC = `10_000_000n`). Never use floats for money. Convert only with `toUnits` / `fromUnits` from `app/src/lib/units.ts`. Timestamps are unix seconds (`number`).

## Commands (run inside `app/`)

- `npm run dev`: local app at http://localhost:3000 (uses the mock while `NEXT_PUBLIC_USE_MOCK=true`)
- `npm test`: unit tests (Vitest). The golden-number tests must always pass.
- `npm run build`: must pass before merging to `main`

## Testing pages on the mock

Add `?role=worker|family|funder|creditor|admin` to any URL to act as that account, with no Freighter needed. The role is remembered for the browser tab. `?mockReset=1` wipes the mock's saved state. `/dev` runs the full golden flow on the mock.

## Git

Small commits, merge to `main` at least daily, and run `npm test` and `npm run build` before you push.
