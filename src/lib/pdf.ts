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
  taxPercentage?: number;
  total: number;
  deliveryTimeline: string;
  paymentTerms: string;
  terms: string;
}

const MARGIN = 15;
const PAGE_BOTTOM = 270; // keep clear of the signature block / footer

export function generateQuotationPDF(data: PDFQuotationData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = 20;

  /** Starts a new page when the next block would run into the bottom margin. */
  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_BOTTOM) {
      doc.addPage();
      y = 20;
      return true;
    }
    return false;
  };

  /** Writes wrapped text and returns the height it used. */
  const paragraph = (text: string, x: number, width: number, lineHeight: number) => {
    const lines: string[] = doc.splitTextToSize(text || "-", width);
    lines.forEach((line, i) => {
      ensureSpace(lineHeight);
      doc.text(line, x, y + 0);
      if (i < lines.length - 1) y += lineHeight;
    });
    y += lineHeight;
  };

  // Header background banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 35, "F");

  // Company Name & Brand
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(doc.splitTextToSize(data.companyName.toUpperCase(), pageWidth - 90)[0], MARGIN, y);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text("Official Development Quotation", MARGIN, y + 7);

  // Right Header - Quotation ID
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(`${data.quotationId}`, pageWidth - MARGIN, y, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Version: ${data.version} | Date: ${data.date}`, pageWidth - MARGIN, y + 7, { align: "right" });

  y = 45;

  // Company Details (Left) vs Client & Project Details (Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text("FROM:", MARGIN, y);
  doc.text("PREPARED FOR:", pageWidth / 2 + 10, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  // Company details (address may wrap to several lines)
  const addressLines: string[] = doc.splitTextToSize(data.companyAddress, 75);
  doc.text(data.companyName, MARGIN, y);
  doc.text(addressLines, MARGIN, y + 4);
  const addrBottom = y + 4 + addressLines.length * 4;
  doc.text(`Email: ${data.companyEmail}`, MARGIN, addrBottom);
  doc.text(`Phone: ${data.companyPhone}`, MARGIN, addrBottom + 4);

  // Client details
  const rightX = pageWidth / 2 + 10;
  const rightWidth = pageWidth - MARGIN - rightX;
  let ry = y;
  [
    `Client: ${data.clientName}`,
    `College: ${data.collegeName}`,
    `Project ID: ${data.projectId}`,
    `Project: ${data.projectName}`,
    `Valid Until: ${data.validUntil}`,
  ].forEach((line) => {
    const wrapped: string[] = doc.splitTextToSize(line, rightWidth);
    doc.text(wrapped, rightX, ry);
    ry += wrapped.length * 4;
  });

  y = Math.max(addrBottom + 4, ry) + 10;

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(MARGIN, y, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("DESCRIPTION", MARGIN + 3, y + 5.5);
    doc.text("QTY", 125, y + 5.5, { align: "center" });
    doc.text("UNIT PRICE (INR)", 155, y + 5.5, { align: "right" });
    doc.text("TOTAL (INR)", pageWidth - MARGIN - 3, y + 5.5, { align: "right" });
    y += 10;
  };
  drawTableHeader();

  // Table Rows: row height follows the wrapped description so long text never overlaps the next row
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  data.items.forEach((item) => {
    const descLines: string[] = doc.splitTextToSize(item.description, 95);
    const rowHeight = Math.max(8, descLines.length * 4 + 4);
    if (ensureSpace(rowHeight)) drawTableHeader();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(descLines, MARGIN + 3, y + 4);
    doc.text(String(item.quantity), 125, y + 4, { align: "center" });
    doc.text(item.unitPrice.toLocaleString("en-IN"), 155, y + 4, { align: "right" });
    doc.text(item.amount.toLocaleString("en-IN"), pageWidth - MARGIN - 3, y + 4, { align: "right" });
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN, y + rowHeight - 1, pageWidth - MARGIN, y + rowHeight - 1);
    y += rowHeight;
  });

  y += 4;

  // Calculations block
  ensureSpace(36);
  const calcX = pageWidth - 75;
  const taxLabel =
    typeof data.taxPercentage === "number" ? `Tax / GST (${data.taxPercentage}%):` : "Tax / GST:";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text("Subtotal:", calcX, y);
  doc.text(`INR ${data.subtotal.toLocaleString("en-IN")}`, pageWidth - MARGIN - 3, y, { align: "right" });

  if (data.discount > 0) {
    y += 5;
    doc.text("Discount:", calcX, y);
    doc.text(`- INR ${data.discount.toLocaleString("en-IN")}`, pageWidth - MARGIN - 3, y, { align: "right" });
  }

  y += 5;
  doc.text(taxLabel, calcX, y);
  doc.text(`INR ${data.tax.toLocaleString("en-IN")}`, pageWidth - MARGIN - 3, y, { align: "right" });

  y += 7;
  doc.setFillColor(238, 242, 255); // Indigo tint
  doc.rect(calcX - 5, y - 4, 65, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(67, 56, 202);
  doc.text("Total Amount:", calcX, y + 2);
  doc.text(`INR ${data.total.toLocaleString("en-IN")}`, pageWidth - MARGIN - 3, y + 2, { align: "right" });

  y += 18;

  // Delivery & Payment Terms
  const labelled = (label: string, value: string) => {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(label, MARGIN, y);
    doc.setFont("helvetica", "normal");
    const lines: string[] = doc.splitTextToSize(value || "-", contentWidth - 38);
    lines.forEach((line, i) => {
      if (i > 0) ensureSpace(5);
      doc.text(line, MARGIN + 38, y);
      if (i < lines.length - 1) y += 4.5;
    });
    y += 7;
  };
  labelled("Delivery Timeline:", data.deliveryTimeline);
  labelled("Payment Terms:", data.paymentTerms);

  y += 3;
  ensureSpace(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Terms & Conditions:", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  paragraph(data.terms, MARGIN, contentWidth, 4);

  // Signature block on the last page
  if (y > 245) {
    doc.addPage();
    y = 20;
  }
  const sy = 260;
  doc.setDrawColor(203, 213, 225);
  doc.line(MARGIN, sy, 75, sy);
  doc.line(pageWidth - 75, sy, pageWidth - MARGIN, sy);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Authorized Signatory", MARGIN, sy + 4);
  doc.text(`${data.companyName}`, MARGIN, sy + 8);
  doc.text("Client / Ambassador Acceptance", pageWidth - 75, sy + 4);
  doc.text("Signature & Date", pageWidth - 75, sy + 8);

  // Page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pages}`, pageWidth / 2, 290, { align: "center" });
  }

  return doc;
}
