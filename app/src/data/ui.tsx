"use client";
import { useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const id = useId();
  const selection = useRef(0);
  const [result, setResult] = useState("");
  async function verify(file: File | undefined) {
    const current = ++selection.current;
    setResult(file ? "Checking invoice…" : "");
    if (!file) return;
    try {
      const fingerprint = await hashFile(file);
      if (current === selection.current) {
        setResult(fingerprint === hash.toLowerCase() ? "This invoice matches the recorded fingerprint." : "This file has a different fingerprint. Try the original invoice.");
      }
    } catch {
      if (current === selection.current) setResult("Unable to read this file. Choose it again to retry.");
    }
  }
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Choose the original invoice</Label>
      <Input id={id} name="verify-invoice" type="file" className="h-auto max-w-md" aria-describedby={`${id}-help`}
        onChange={(event) => void verify(event.target.files?.[0])} />
      <p id={`${id}-help`} className="text-xs text-muted-foreground">The file stays in your browser.</p>
      <p role="status" className="font-medium">{result}</p>
    </div>
  );
}
