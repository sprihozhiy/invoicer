import { NextRequest } from "next/server";

import { apiError, handleRouteError, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { ensureCanSend, withComputedStatus } from "@/lib/invoices";
import { ensureEmail, ensureOptionalString, ensureUuid } from "@/lib/validate";
import { nowIso } from "@/lib/time";
import { store } from "@/lib/store";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const invoiceId = ensureUuid(id, "id");

    const invoice = store.invoices.find((item) => item.id === invoiceId && item.userId === user.id && item.deletedAt === null);
    if (!invoice) {
      apiError(404, "NOT_FOUND", "Invoice not found.");
    }

    ensureCanSend(invoice);

    const body = await readJsonBody<Record<string, unknown>>(req);
    ensureEmail(body.recipientEmail, "recipientEmail");
    const message = ensureOptionalString(body.message, "message", 1000);
    if (typeof message === "string" && message.length > 1000) {
      apiError(400, "VALIDATION_ERROR", "message exceeds 1000 characters.", "message");
    }

    invoice.status = "sent";
    invoice.sentAt = nowIso();
    invoice.updatedAt = nowIso();

    return successResponse(withComputedStatus(invoice), 200);
  } catch (error) {
    return handleRouteError(error);
  }
}
