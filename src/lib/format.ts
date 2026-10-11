/** Format an amount to Indian Rupee with consistent locale for SSR/CSR matching */
export function formatCurrency(amount: number | null | undefined): string {
  const val = Number(amount) || 0;
  return `₹${val.toLocaleString("en-IN")}`;
}

/** Format numbers with en-IN grouping (lakhs/crores) consistently on server and client */
export function formatNumber(num: number | null | undefined): string {
  const val = Number(num) || 0;
  return val.toLocaleString("en-IN");
}

/** Budget shown for a project: the approved amount, else any stated expectation, else a clear placeholder. */
export function budgetLabel(project: { approvedBudget?: number; expectedBudget?: number } | null | undefined): string {
  const amount = project?.approvedBudget || project?.expectedBudget || 0;
  return amount > 0 ? formatCurrency(amount) : "Awaiting quotation";
}

