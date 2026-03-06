import { Invoice, BusinessProfile, Client } from "@/lib/models";

function escapePdf(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function generateInvoicePdf(invoice: Invoice, profile: BusinessProfile, client: Client): Buffer {
  const lines = [
    `Invoice ${invoice.invoiceNumber}`,
    `Business: ${profile.businessName || "-"}`,
    `Client: ${client.name}`,
    `Issue Date: ${invoice.issueDate}`,
    `Due Date: ${invoice.dueDate}`,
    `Status: ${invoice.status}`,
    `Total: ${invoice.total}`,
    `Amount Due: ${invoice.amountDue}`,
  ];

  const textContent = lines.join("\\n");
  const escaped = escapePdf(textContent);

  const content = `BT /F1 12 Tf 50 780 Td (${escaped}) Tj ET`;
  const body = `%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n4 0 obj<< /Length ${content.length} >>stream\n${content}\nendstream\nendobj\n5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000243 00000 n \n0000000338 00000 n \ntrailer<< /Root 1 0 R /Size 6 >>\nstartxref\n410\n%%EOF`;
  return Buffer.from(body, "utf8");
}
