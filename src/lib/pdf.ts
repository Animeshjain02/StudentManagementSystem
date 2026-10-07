import { jsPDF } from "jspdf";

export interface PDFQuotationData {
  quotationId: string;
  version: number;
  date: string;
  validUntil: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  clientName: string;
  clientEmail: string;
  collegeName: string;
  projectName: string;
  projectId: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  deliveryTimeline: string;
  paymentTerms: string;
  terms: string;
}

export function generateQuotationPDF(data: PDFQuotationData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header background banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 35, "F");

  // Company Name & Brand
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(data.companyName.toUpperCase(), 15, y);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text("Official Development Quotation", 15, y + 7);

  // Right Header - Quotation ID
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(`${data.quotationId}`, pageWidth - 15, y, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Version: ${data.version} | Date: ${data.date}`, pageWidth - 15, y + 7, { align: "right" });

  y = 45;

  // Company Details (Left) vs Client & Project Details (Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text("FROM:", 15, y);
  doc.text("PREPARED FOR:", pageWidth / 2 + 10, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  // Company details
  doc.text(data.companyName, 15, y);
  doc.text(data.companyAddress, 15, y + 4, { maxWidth: 75 });
  doc.text(`Email: ${data.companyEmail}`, 15, y + 14);
  doc.text(`Phone: ${data.companyPhone}`, 15, y + 18);

  // Client details
  doc.text(`Client: ${data.clientName}`, pageWidth / 2 + 10, y);
  doc.text(`College: ${data.collegeName}`, pageWidth / 2 + 10, y + 4);
  doc.text(`Project ID: ${data.projectId}`, pageWidth / 2 + 10, y + 8);
  doc.text(`Project: ${data.projectName}`, pageWidth / 2 + 10, y + 12);
  doc.text(`Valid Until: ${data.validUntil}`, pageWidth / 2 + 10, y + 16);

  y += 30;

  // Table Header
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(15, y, pageWidth - 30, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("DESCRIPTION", 18, y + 5.5);
  doc.text("QTY", 125, y + 5.5, { align: "center" });
  doc.text("UNIT PRICE (INR)", 155, y + 5.5, { align: "right" });
  doc.text("TOTAL (INR)", pageWidth - 18, y + 5.5, { align: "right" });

  y += 10;

  // Table Rows
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  data.items.forEach((item) => {
    doc.text(item.description, 18, y + 4, { maxWidth: 100 });
    doc.text(String(item.quantity), 125, y + 4, { align: "center" });
    doc.text(item.unitPrice.toLocaleString("en-IN"), 155, y + 4, { align: "right" });
    doc.text(item.amount.toLocaleString("en-IN"), pageWidth - 18, y + 4, { align: "right" });

    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 7, pageWidth - 15, y + 7);
    y += 10;
  });

  y += 4;

  // Calculations block
  const calcX = pageWidth - 75;
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", calcX, y);
  doc.text(`INR ${data.subtotal.toLocaleString("en-IN")}`, pageWidth - 18, y, { align: "right" });

  if (data.discount > 0) {
    y += 5;
    doc.text("Discount:", calcX, y);
    doc.text(`- INR ${data.discount.toLocaleString("en-IN")}`, pageWidth - 18, y, { align: "right" });
  }

  y += 5;
  doc.text("Tax / GST (18%):", calcX, y);
  doc.text(`INR ${data.tax.toLocaleString("en-IN")}`, pageWidth - 18, y, { align: "right" });

  y += 7;
  doc.setFillColor(238, 242, 255); // Indigo tint
  doc.rect(calcX - 5, y - 4, 65, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(67, 56, 202);
  doc.text("Total Amount:", calcX, y + 2);
  doc.text(`INR ${data.total.toLocaleString("en-IN")}`, pageWidth - 18, y + 2, { align: "right" });

  y += 18;

  // Delivery & Payment Terms
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Delivery Timeline:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.deliveryTimeline, 50, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Payment Terms:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.paymentTerms, 50, y, { maxWidth: pageWidth - 65 });

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.text("Terms & Conditions:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(data.terms, 15, y + 4, { maxWidth: pageWidth - 30 });

  // Signature Block
  y = 260;
  doc.setDrawColor(203, 213, 225);
  doc.line(15, y, 75, y);
  doc.line(pageWidth - 75, y, pageWidth - 15, y);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Authorized Signatory", 15, y + 4);
  doc.text(`${data.companyName}`, 15, y + 8);

  doc.text("Client / Ambassador Acceptance", pageWidth - 75, y + 4);
  doc.text("Signature & Date", pageWidth - 75, y + 8);

  return doc;
}
