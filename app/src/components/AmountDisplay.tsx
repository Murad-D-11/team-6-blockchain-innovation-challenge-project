import { cn } from "@/lib/utils";
import { formatPhp, formatUsd, PHP_PER_USD } from "@/lib/units";

/** USD amount (test USDC) with the peso value underneath at the illustrative rate. */
export function AmountDisplay({
  units,
  size = "md",
  showPhp = true,
  className,
}: {
  units: bigint;
  size?: "sm" | "md" | "lg";
  showPhp?: boolean;
  className?: string;
}) {
  const usd = { sm: "text-base", md: "text-xl", lg: "text-3xl" }[size];
  return (
    <div className={cn("leading-tight", className)}>
      <div className={cn("register-figure font-medium", usd)}>
        {formatUsd(units)} <span className="font-sans text-xs font-normal text-muted-foreground">test USDC</span>
      </div>
      {showPhp && (
        <div className="text-xs text-muted-foreground tabular-nums">
          ≈ {formatPhp(units)} <span title={`₱${PHP_PER_USD} per USD`}>(illustrative rate)</span>
        </div>
      )}
    </div>
  );
}

export default AmountDisplay;
