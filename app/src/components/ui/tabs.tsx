"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal tabs (shadcn-style names). Controlled or uncontrolled:
 *   <Tabs defaultValue="requests"> <TabsList> <TabsTrigger value="requests">Requests</TabsTrigger> … </TabsList>
 *   <TabsContent value="requests">…</TabsContent> </Tabs>
 */
const Ctx = React.createContext<{ value: string; setValue: (v: string) => void } | null>(null);

export function Tabs({ defaultValue, value, onValueChange, className, children }: {
  defaultValue?: string; value?: string; onValueChange?: (v: string) => void; className?: string; children: React.ReactNode;
}) {
  const [inner, setInner] = React.useState(defaultValue ?? "");
  const current = value ?? inner;
  const setValue = (v: string) => { if (value === undefined) setInner(v); onValueChange?.(v); };
  return <Ctx.Provider value={{ value: current, setValue }}><div className={cn("space-y-3", className)}>{children}</div></Ctx.Provider>;
}

export function TabsList({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" className={cn("inline-flex rounded-lg bg-muted p-1", className)} {...p} />;
}

export function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(Ctx)!;
  const active = ctx.value === value;
  return (
    <button type="button" role="tab" aria-selected={active} onClick={() => ctx.setValue(value)}
      className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground", className)}>
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(Ctx)!;
  if (ctx.value !== value) return null;
  return <div role="tabpanel" className={className}>{children}</div>;
}
