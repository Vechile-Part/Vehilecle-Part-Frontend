const nprFormatter = new Intl.NumberFormat("en-NP", {
  style: "currency",
  currency: "NPR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format amounts in Nepalese Rupees (NPR / Rs.) — never USD. */
export function formatNpr(amount: number): string {
  if (!Number.isFinite(amount)) return "Rs. 0.00";
  return nprFormatter.format(amount);
}
