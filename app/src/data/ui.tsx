"use client";
import { useState } from "react";
import { hashFile } from "@/lib/hash";
import { classifyRequest, type ProviderEntry, type Rule } from "@/lib/rulebook";
import type { PayoffRequest } from "@/lib/types";
import providers from "./providers.json";
import rules from "./rulebook.json";

export const providerData = providers as ProviderEntry[];
export const ruleData = rules as Rule[];
export const classify = (r: PayoffRequest) => classifyRequest(r, providerData, ruleData);
export const provider = (address: string) => providerData.find(p => p.address === address);
export function Verify({ hash }: { hash: string }) {
  const [result, setResult] = useState("");
  return <div><label className="block font-medium">Verify document <input className="block max-w-full" type="file" onChange={async e => { const f = e.target.files?.[0]; setResult(""); if (f) { try { setResult((await hashFile(f)) === hash.toLowerCase() ? "Match" : "Mismatch"); } catch { setResult("Unable to read file"); } } }} /></label><p aria-live="polite">{result}</p><p className="text-sm">The file stays in your browser.</p></div>;
}
