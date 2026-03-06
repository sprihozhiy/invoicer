import { NextRequest } from "next/server";

import { apiError, handleRouteError, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { withComputedStatus } from "@/lib/invoices";
import { ensureUuid } from "@/lib/validate";
import { nowIso } from "@/lib/time";
import { store } from "@/lib/store";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string; paymentId: string }> }) {
  try {
    const user = requireAuth(req);
    const { id, paymentId } = await context.params;
    const invoiceId = ensureUuid(id, "id");
    const pid = ensureUuid(paymentId, "paymentId");

    const invoice = store.invoices.find((item) => item.id === invoiceId && item.userId === user.id && item.deletedAt === null);
    if (!invoice) {
      apiError(404, "NOT_FOUND", "Payment not found.");
    }

    const paymentIndex = store.payments.findIndex((item) => item.id === pid && item.invoiceId === invoice.id);
    if (paymentIndex < 0) {
      apiError(404, "NOT_FOUND", "Payment not found.");
    }

    store.payments.splice(paymentIndex, 1);

    const totalPaid = store.payments.filter((item) => item.invoiceId === invoice.id).reduce((sum, item) => sum + item.amount, 0);
    invoice.amountPaid = totalPaid;
    invoice.amountDue = Math.max(0, invoice.total - totalPaid);

    if (totalPaid === 0) {
      invoice.status = "sent";
      invoice.paidAt = null;
    } else if (totalPaid < invoice.total) {
      invoice.status = "partial";
      invoice.paidAt = null;
    } else {
      invoice.status = "paid";
    }

    invoice.updatedAt = nowIso();

    return successResponse({ invoice: withComputedStatus(invoice) }, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}
