/** 1 USDC = 10_000_000 units (7 decimals). Never use floats for money. */
export const DECIMALS = 7;
export const ONE = 10_000_000n;
export const PHP_PER_USD = 58; // illustrative rate; label it so in the UI

/** Parse "400", "400.5", "928.80" (up to 7 decimals) into bigint units. Throws on anything else. */
export function toUnits(str: string): bigint {
  if (typeof str !== "string") throw new Error("Invalid amount");
  const s = str.trim();
  const m = /^(\d+)(?:\.(\d{1,7}))?$/.exec(s);
  if (!m) throw new Error(`Invalid amount: "${str}"`);
  const frac = (m[2] ?? "").padEnd(DECIMALS, "0");
  return BigInt(m[1]) * ONE + BigInt(frac);
}

/** Plain decimal string, truncated (not rounded) to `dp` places (0..7). */
export function fromUnits(units: bigint, dp = 2): string {
  if (!Number.isInteger(dp) || dp < 0 || dp > DECIMALS) throw new Error("dp must be 0..7");
  const neg = units < 0n;
  const abs = neg ? -units : units;
  const whole = abs / ONE;
  const frac = (abs % ONE).toString().padStart(DECIMALS, "0").slice(0, dp);
  const out = dp > 0 ? `${whole}.${frac}` : `${whole}`;
  return neg && /[1-9]/.test(out) ? `-${out}` : out;
}

function withCommas(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** units -> "$956.66" (truncated, thousands separators). */
export function formatUsd(units: bigint): string {
  const s = fromUnits(units, 2);
  const neg = s.startsWith("-");
  const [w, f] = (neg ? s.slice(1) : s).split(".");
  return `${neg ? "-" : ""}$${withCommas(w)}.${f}`;
}

/** units -> "₱55,486" (USD x PHP_PER_USD, no decimals, truncated). */
export function formatPhp(units: bigint): string {
  const php = (units * BigInt(PHP_PER_USD)) / ONE;
  const neg = php < 0n;
  return `${neg ? "-" : ""}₱${withCommas((neg ? -php : php).toString())}`;
}
