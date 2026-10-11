import { generateQuotationPDF } from "@/lib/pdf";

export interface CompanyInfo {
  companyName: string;
  companyAddress: string;
  email: string;
  phone: string;
}

const FALLBACK_COMPANY: CompanyInfo = {
  companyName: "NexusDev Solutions Pvt Ltd",
  companyAddress: "Innov8 Hub, Koramangala 5th Block, Bengaluru, Karnataka 560095",
  email: "contact@nexusdev.solutions",
  phone: "+91 80 4912 3456",
};

/** Company details configured in Admin → Settings (falls back to defaults if unavailable). */
export async function fetchCompanyInfo(): Promise<CompanyInfo> {
  try {
    const res = await fetch("/api/admin/settings");
    if (!res.ok) return FALLBACK_COMPANY;
    const { settings } = await res.json();
    return {
      companyName: settings?.companyName || FALLBACK_COMPANY.companyName,
      companyAddress: settings?.companyAddress || FALLBACK_COMPANY.companyAddress,
      email: settings?.email || FALLBACK_COMPANY.email,
      phone: settings?.phone || FALLBACK_COMPANY.phone,
    };
  } catch {
    return FALLBACK_COMPANY;
  }
}

/** Builds and downloads the official quotation PDF using the live company settings. */
export async function downloadQuotationPDF(quotation: any, project: any) {
  const company = await fetchCompanyInfo();
  const doc = generateQuotationPDF({
    quotationId: quotation.quotationId,
    version: quotation.version,
    date: new Date(quotation.createdAt).toLocaleDateString(),
    validUntil: new Date(quotation.validUntil).toLocaleDateString(),
    companyName: company.companyName,
    companyAddress: company.companyAddress,
    companyEmail: company.email,
    companyPhone: company.phone,
    clientName: project.clientName,
    clientEmail: project.clientEmail,
    collegeName: project.collegeName,
    projectName: project.projectName,
    projectId: project.projectId,
    items: quotation.items,
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    tax: quotation.tax,
    taxPercentage: quotation.taxPercentage,
    total: quotation.total,
    deliveryTimeline: quotation.deliveryTimeline,
    paymentTerms: quotation.paymentTerms,
    terms: quotation.terms,
  });
  doc.save(`${quotation.quotationId}_v${quotation.version}.pdf`);
}
