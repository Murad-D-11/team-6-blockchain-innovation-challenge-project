import { toUnits } from "./units";

export type BillType = "medical_exam" | "training" | "placement_fee" | "other";
export type ProviderKind = "clinic" | "training_center" | "agency";
export type Payer = "employer" | "worker" | "prohibited" | "needs_review";
export interface Rule { billType: BillType; providerKind: ProviderKind; payer: "employer" | "worker" | "prohibited";
  capUsd?: number; label: string; reason: string; sourceLabel: string; sourceUrl: string }
export interface ProviderEntry { address: string | null; name: string; kind: ProviderKind; verified: boolean; regNo: string; fictional: true }
export interface Classification { payer: Payer; rule: Rule | null; reason: string; blocksRequest: boolean }

function needsReview(rule: Rule | null, reason: string): Classification {
  return { payer: "needs_review", rule, reason, blocksRequest: true };
}

export function classifyBill(
  input: { billType: BillType; providerKind: ProviderKind; verified: boolean; amount: bigint },
  rules: Rule[],
): Classification {
  const rule = rules.find((r) => r.billType === input.billType && r.providerKind === input.providerKind) ?? null;
  if (!rule) return needsReview(null, "No demo rule matches this bill type and provider.");
  if (rule.payer === "prohibited") {
    return { payer: "prohibited", rule, reason: rule.reason, blocksRequest: true };
  }
  if (!input.verified) return needsReview(rule, "This provider is not on the demo’s verified list.");
  if (rule.capUsd !== undefined && input.amount > toUnits(String(rule.capUsd))) {
    return needsReview(rule, `The amount is above the illustrative cap of ${rule.capUsd} USDC.`);
  }
  return { payer: rule.payer, rule, reason: rule.reason, blocksRequest: false };
}

export function classifyRequest(
  req: { creditor: string; legalAmount: bigint },
  providers: ProviderEntry[],
  rules: Rule[],
): Classification {
  const provider = providers.find((p) => p.address !== null && p.address === req.creditor);
  if (!provider) return needsReview(null, "The provider is not on the demo list.");
  const candidates = rules.filter((r) => r.providerKind === provider.kind);
  if (candidates.length === 0) return needsReview(null, "No demo rule matches this provider.");
  // Bill type is not stored on-chain: it is the billType of the rule matching the provider's kind.
  return classifyBill(
    { billType: candidates[0].billType, providerKind: provider.kind, verified: provider.verified, amount: req.legalAmount },
    rules,
  );
}
