import { NextRequest, NextResponse } from "next/server";

import { apiError, handleRouteError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getBusinessProfile, requireClientOwned, requireInvoiceOwned } from "@/lib/domain";
import { withComputedStatus } from "@/lib/invoices";
import { generateInvoicePdf } from "@/lib/pdf";
import { safeFetch } from "@/lib/security";
import { ensureUuid } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const invoiceId = ensureUuid(id, "id");

    const invoice = requireInvoiceOwned(user.id, invoiceId);
    if (invoice.status === "void") {
      apiError(400, "INVOICE_VOID", "Cannot generate PDF for a void invoice.");
    }

    const profile = getBusinessProfile(user.id);
    const client = requireClientOwned(user.id, invoice.clientId);

    if (profile.logoUrl) {
      try {
        await safeFetch(profile.logoUrl, { method: "GET" }, 3000, 2 * 1024 * 1024);
      } catch {
        // ignore logo fetch errors and continue PDF generation
      }
    }

    let pdf: Buffer;
    try {
      pdf = generateInvoicePdf(withComputedStatus(invoice), profile, client);
    } catch {
      apiError(500, "PDF_GENERATION_FAILED", "Failed to generate PDF.");
    }

    if (pdf.byteLength > 5 * 1024 * 1024) {
      apiError(500, "PDF_GENERATION_FAILED", "Generated PDF exceeds size limits.");
    }

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${invoice.invoiceNumber}.pdf\"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
