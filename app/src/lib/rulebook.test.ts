import { describe, expect, it } from "vitest";
import { classifyBill, classifyRequest, type ProviderEntry, type Rule } from "./rulebook";
import { toUnits } from "./units";

const RULES: Rule[] = [
  { billType: "medical_exam", providerKind: "clinic", payer: "employer", capUsd: 100, label: "Pre-entry medical exam",
    reason: "The employer pays the medical exam.", sourceLabel: "Source A", sourceUrl: "https://example.org/a" },
  { billType: "training", providerKind: "training_center", payer: "worker", capUsd: 250, label: "Required training",
    reason: "Training may be charged to the worker.", sourceLabel: "Source B", sourceUrl: "https://example.org/b" },
  { billType: "placement_fee", providerKind: "agency", payer: "prohibited", label: "Placement fee",
    reason: "Zero placement fee policy.", sourceLabel: "Source C", sourceUrl: "https://example.org/c" },
];

const CLINIC = "GCLINIC";
const TRAINING = "GTRAINING";
const PROVIDERS: ProviderEntry[] = [
  { address: TRAINING, name: "Training", kind: "training_center", verified: true, regNo: "TC-0", fictional: true },
  { address: CLINIC, name: "Clinic", kind: "clinic", verified: true, regNo: "MC-0", fictional: true },
  { address: null, name: "Agency", kind: "agency", verified: true, regNo: "EA-0", fictional: true },
];

describe("classifyBill", () => {
  it("employer-owed medical exam", () => {
    const c = classifyBill({ billType: "medical_exam", providerKind: "clinic", verified: true, amount: toUnits("65") }, RULES);
    expect(c.payer).toBe("employer");
    expect(c.rule?.billType).toBe("medical_exam");
    expect(c.blocksRequest).toBe(false);
  });
  it("worker-payable training", () => {
    const c = classifyBill({ billType: "training", providerKind: "training_center", verified: true, amount: toUnits("190") }, RULES);
    expect(c.payer).toBe("worker");
    expect(c.blocksRequest).toBe(false);
  });
  it("prohibited placement fee", () => {
    const c = classifyBill({ billType: "placement_fee", providerKind: "agency", verified: true, amount: toUnits("1380") }, RULES);
    expect(c.payer).toBe("prohibited");
    expect(c.rule?.sourceUrl).toBe("https://example.org/c");
    expect(c.blocksRequest).toBe(true);
  });
  it("placement fee from an unverified provider is still prohibited", () => {
    const c = classifyBill({ billType: "placement_fee", providerKind: "agency", verified: false, amount: toUnits("1380") }, RULES);
    expect(c.payer).toBe("prohibited");
    expect(c.blocksRequest).toBe(true);
  });
  it("amount above cap needs review; exactly at cap is fine", () => {
    const over = classifyBill({ billType: "training", providerKind: "training_center", verified: true, amount: toUnits("250.0000001") }, RULES);
    expect(over.payer).toBe("needs_review");
    expect(over.blocksRequest).toBe(true);
    const at = classifyBill({ billType: "training", providerKind: "training_center", verified: true, amount: toUnits("250") }, RULES);
    expect(at.payer).toBe("worker");
  });
  it("unverified provider needs review", () => {
    const c = classifyBill({ billType: "medical_exam", providerKind: "clinic", verified: false, amount: toUnits("65") }, RULES);
    expect(c.payer).toBe("needs_review");
    expect(c.blocksRequest).toBe(true);
  });
  it("unknown bill type needs review", () => {
    const c = classifyBill({ billType: "other", providerKind: "clinic", verified: true, amount: toUnits("10") }, RULES);
    expect(c.payer).toBe("needs_review");
    expect(c.rule).toBeNull();
    expect(c.blocksRequest).toBe(true);
  });
});

describe("classifyRequest", () => {
  it("finds the provider by creditor address and picks the rule by its kind", () => {
    expect(classifyRequest({ creditor: CLINIC, legalAmount: toUnits("65") }, PROVIDERS, RULES).payer).toBe("employer");
    expect(classifyRequest({ creditor: TRAINING, legalAmount: toUnits("190") }, PROVIDERS, RULES).payer).toBe("worker");
  });
  it("unknown provider address needs review", () => {
    expect(classifyRequest({ creditor: "GOTHER", legalAmount: toUnits("10") }, PROVIDERS, RULES).payer).toBe("needs_review");
  });
});
