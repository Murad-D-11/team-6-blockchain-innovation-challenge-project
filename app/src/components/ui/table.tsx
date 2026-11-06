import * as React from "react";
import { cn } from "@/lib/utils";

/** shadcn-style table pieces. Wrap in a div with overflow-x-auto on phones (Table does this for you). */
export function Table({ className, ...p }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <div className="w-full overflow-x-auto"><table className={cn("w-full caption-bottom text-sm", className)} {...p} /></div>;
}
export function TableHeader(p: React.HTMLAttributes<HTMLTableSectionElement>) { return <thead className="[&_tr]:border-b" {...p} />; }
export function TableBody(p: React.HTMLAttributes<HTMLTableSectionElement>) { return <tbody className="[&_tr:last-child]:border-0" {...p} />; }
export function TableRow({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-border", className)} {...p} />;
}
export function TableHead({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("h-9 px-2 text-left align-middle text-xs font-medium text-muted-foreground", className)} {...p} />;
}
export function TableCell({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("p-2 align-middle", className)} {...p} />;
}
