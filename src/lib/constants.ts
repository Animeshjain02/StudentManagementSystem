export const PROJECT_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "REQUIREMENT_CLARIFICATION",
  "QUOTATION_PREPARATION",
  "QUOTATION_SENT",
  "AWAITING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "ASSIGNED",
  "WORKING",
  "TESTING",
  "CLIENT_REVIEW",
  "CHANGES_REQUESTED",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "PAYMENT_PENDING",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_TYPES = [
  "Web Application",
  "Mobile Application",
  "Desktop Application",
  "AI/ML",
  "Data Science",
  "ERP",
  "CRM",
  "E-commerce",
  "Other",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
