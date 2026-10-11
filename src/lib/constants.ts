export const PROJECT_STATUSES = [
  "SUBMITTED",
  "QUOTATION_SENT",
  "APPROVED",
  "IN_PROGRESS",
  "WORKING",
  "COMPLETED",
  "PAYMENT_PENDING",
  "DELIVERED",
  "UNDER_REVIEW",
  "REQUIREMENT_CLARIFICATION",
  "QUOTATION_PREPARATION",
  "AWAITING_APPROVAL",
  "REJECTED",
  "ASSIGNED",
  "TESTING",
  "CLIENT_REVIEW",
  "CHANGES_REQUESTED",
  "READY_FOR_DELIVERY",
  "CANCELLED",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STAGE_OPTIONS = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "QUOTATION_SENT", label: "Quotation" },
  { value: "APPROVED", label: "Approval" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PAYMENT_PENDING", label: "Payment" },
  { value: "DELIVERED", label: "Delivered" },
] as const;

export const PROJECT_TYPES = [
  "Software",
  "Hardware",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
