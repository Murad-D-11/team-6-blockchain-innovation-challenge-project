/**
 * PLACEHOLDER demo data until Luke's H1 is on main (app/src/data/providers.json, rulebook.json, people.json).
 * Copied from the shapes in docs/PLAN-v2.md. When Luke's files land, replace the three constants with:
 *   import providersJson from "@/data/providers.json";   export const PROVIDERS = providersJson as ProviderEntry[];
 *   import rulebookJson from "@/data/rulebook.json";     export const RULES = rulebookJson as Rule[];
 *   import peopleJson from "@/data/people.json";         export const PEOPLE = peopleJson as People;
 * and delete the rest of this comment. Pages import only from this file, so nothing else changes.
 */
import config from "@/lib/config";
import type { ProviderEntry, Rule } from "@/lib/rulebook";

export interface People {
  worker: { name: string; country?: string; employer?: string; job?: string };
  family: { name: string; relation?: string; city?: string };
  funder: { name: string; type?: string };
  grantFunder?: { name: string; type?: string };
  employer?: { name: string; type?: string };
}

export const PROVIDERS: ProviderEntry[] = [
  { address: config.accounts.creditor, name: "Pasig Skills Training Center", kind: "training_center", verified: true, regNo: "TC-0000 (fictional)", fictional: true },
  { address: config.accounts.clinic, name: "Bayside Medical Clinic", kind: "clinic", verified: true, regNo: "MC-0000 (fictional)", fictional: true },
  { address: null, name: "Golden Gate Recruitment Agency", kind: "agency", verified: true, regNo: "EA-0000 (fictional)", fictional: true },
];

export const RULES: Rule[] = [
  { billType: "medical_exam", providerKind: "clinic", payer: "employer", capUsd: 100, label: "Pre-entry medical exam",
    reason: "The Hong Kong employer is responsible for the helper's pre-entry medical exam.",
    sourceLabel: "HK Labour Department: FDH guide", sourceUrl: "https://www.fdh.labour.gov.hk/res/pdf/text_alternative/FDHguideEnglish.pdf" },
  { billType: "training", providerKind: "training_center", payer: "worker", capUsd: 250, label: "Required pre-departure training",
    reason: "Philippine agencies may still charge training fees. About 11,000 pesos is a reported benchmark, not an official cap.",
    sourceLabel: "SCMP: zero placement fee policy", sourceUrl: "https://amp.scmp.com/news/asia/southeast-asia/article/2176773/hong-kong-urged-investigate-local-partners-illegal" },
  { billType: "placement_fee", providerKind: "agency", payer: "prohibited", label: "Placement fee",
    reason: "The Philippines has a zero placement fee policy for domestic workers. Hong Kong caps agency commission at 10% of the first month's wages, payable only after placement.",
    sourceLabel: "HK Employment Agencies Administration", sourceUrl: "https://www.eaa.labour.gov.hk/en/helpers.html" },
];

export const PEOPLE: People = {
  worker: { name: "Maria Santos", country: "Hong Kong", job: "Domestic worker" },
  family: { name: "Lorna Santos", relation: "Mother", city: "Iloilo" },
  funder: { name: "Bayanihan Microfinance", type: "Loan" },
  employer: { name: "Hong Kong household (employer)", type: "Grant" },
};

export function providerByAddress(address: string): ProviderEntry | undefined {
  return PROVIDERS.find((p) => p.address === address);
}

export function providerName(address: string): string {
  return providerByAddress(address)?.name ?? address;
}

/** Who paid, by loan mode: Grant is the employer, Loan is the mission funder. */
export function payerName(mode: "Loan" | "Grant"): string {
  return mode === "Grant" ? (PEOPLE.employer?.name ?? PEOPLE.grantFunder?.name ?? "Employer") : PEOPLE.funder.name;
}

export function firstName(full: string): string {
  return full.split(" ")[0];
}
