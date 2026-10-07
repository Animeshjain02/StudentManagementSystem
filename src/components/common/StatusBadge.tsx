import React from "react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const s = status.toUpperCase();

  let colorClasses = "bg-slate-100 text-slate-700 border-slate-300";
  let dotColor = "bg-slate-400";

  // Project and Quotation status color mappings
  if (["APPROVED", "ACCEPTED", "COMPLETED", "ACTIVE"].includes(s)) {
    colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
    dotColor = "bg-emerald-500";
  } else if (["WORKING", "IN_PROGRESS", "DEVELOPMENT"].includes(s)) {
    colorClasses = "bg-indigo-50 text-indigo-700 border-indigo-200";
    dotColor = "bg-indigo-500 animate-pulse";
  } else if (["QUOTATION_SENT", "SENT", "TESTING", "READY_FOR_DELIVERY"].includes(s)) {
    colorClasses = "bg-blue-50 text-blue-700 border-blue-200";
    dotColor = "bg-blue-500";
  } else if (["SUBMITTED", "UNDER_REVIEW", "REQUIREMENT_CLARIFICATION", "AWAITING_APPROVAL", "DRAFT", "PENDING"].includes(s)) {
    colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
    dotColor = "bg-amber-500";
  } else if (["CHANGES_REQUESTED", "DELAYED", "PARTIAL", "PAYMENT_PENDING"].includes(s)) {
    colorClasses = "bg-orange-50 text-orange-700 border-orange-200";
    dotColor = "bg-orange-500";
  } else if (["REJECTED", "CANCELLED", "OVERDUE", "DISABLED", "SUSPENDED", "EXPIRED"].includes(s)) {
    colorClasses = "bg-rose-50 text-rose-700 border-rose-200";
    dotColor = "bg-rose-500";
  } else if (["DELIVERED", "PAID"].includes(s)) {
    colorClasses = "bg-teal-50 text-teal-700 border-teal-200";
    dotColor = "bg-teal-500";
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  }[size];

  const formattedText = status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm ${colorClasses} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {formattedText}
    </span>
  );
}
