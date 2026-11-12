"use client";

import type { ReactNode } from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

type TabsProps = {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
};

export function Tabs({ className, onValueChange, ...props }: TabsProps) {
  return (
    <BaseTabs.Root
      className={cn("space-y-4", className)}
      onValueChange={(value) => { if (typeof value === "string") onValueChange?.(value); }}
      {...props}
    />
  );
}

export function TabsList({ className, ...props }: Omit<BaseTabs.List.Props, "className"> & { className?: string }) {
  return <BaseTabs.List {...props} className={cn("inline-flex rounded-md border border-border bg-muted p-1", className)} />;
}

export function TabsTrigger({ className, ...props }: Omit<BaseTabs.Tab.Props, "className"> & { className?: string }) {
  return (
    <BaseTabs.Tab {...props} className={cn("min-h-9 rounded-sm px-4 text-sm font-semibold text-muted-foreground hover:text-foreground data-active:bg-card data-active:text-foreground", className)} />
  );
}

export const TabsContent = BaseTabs.Panel;
