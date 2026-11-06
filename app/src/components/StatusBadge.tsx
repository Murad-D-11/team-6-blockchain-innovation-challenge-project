import type { Loan, LoanStatus, RequestStatus } from "@/lib/types";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

export type DisplayStatus = RequestStatus | LoanStatus | "Paused" | "Overdue";

const STYLES: Record<DisplayStatus, string> = {
  Open: "border-blue-200 bg-blue-50 text-blue-700",
  Confirmed: "border-indigo-200 bg-indigo-50 text-indigo-700",
  Funded: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Cancelled: "border-gray-200 bg-gray-100 text-gray-600",
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Repaid: "border-emerald-300 bg-emerald-100 text-emerald-800",
  Paused: "border-amber-200 bg-amber-50 text-amber-800",
  Overdue: "border-red-300 bg-red-50 text-red-700",
};

/** One badge for request and loan states. Pass `detail` for things like "1 of 3". */
export function StatusBadge({ status, detail, className }: { status: DisplayStatus; detail?: string; className?: string }) {
  return (
    <Badge className={cn(STYLES[status], className)}>
      {status}
      {detail ? ` · ${detail}` : ""}
    </Badge>
  );
}

/** What a loan should show: Repaid, Overdue, Paused n of max, or Active. */
export function loanDisplayStatus(loan: Loan, maxPausePeriods: number): { status: DisplayStatus; detail?: string } {
  if (loan.status === "Repaid") return { status: "Repaid" };
  if (loan.isOverdue) return { status: "Overdue", detail: `${loan.missedPeriods} missed` };
  if (loan.missedPeriods > 0) return { status: "Paused", detail: `${loan.missedPeriods} of ${maxPausePeriods}` };
  return { status: "Active" };
}

/** Convenience: badge straight from a loan. */
export function LoanStatusBadge({ loan, maxPausePeriods }: { loan: Loan; maxPausePeriods: number }) {
  const s = loanDisplayStatus(loan, maxPausePeriods);
  return <StatusBadge status={s.status} detail={s.detail} />;
}

export default StatusBadge;
