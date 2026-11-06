/**
 * Demo data for Ananya's pages, read from Luke's files in app/src/data/ (providers.json, rulebook.json, people.json).
 * Pages import from here so the JSON is typed in one place.
 */
import type { ProviderEntry, Rule } from "@/lib/rulebook";
import peopleJson from "@/data/people.json";
import providersJson from "@/data/providers.json";
import rulebookJson from "@/data/rulebook.json";

export interface People {
  worker: { name: string; country?: string; employer?: string; job?: string };
  family: { name: string; relation?: string; city?: string };
  funder: { name: string; type?: string };
  grantFunder?: { name: string; type?: string };
  employer?: { name: string; type?: string };
}

export const PROVIDERS = providersJson as ProviderEntry[];
export const RULES = rulebookJson as Rule[];
export const PEOPLE = peopleJson as People;

/** Luke's fictional sample invoices in app/public/samples/, by bill type. */
export const SAMPLE_INVOICES: Partial<Record<Rule["billType"], string>> = {
  training: "/samples/training.pdf",
  medical_exam: "/samples/medical.pdf",
  placement_fee: "/samples/placement.pdf",
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
