import { NextRequest } from "next/server";

import { apiError, handleRouteError, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { ensureCanVoid, withComputedStatus } from "@/lib/invoices";
import { ensureUuid } from "@/lib/validate";
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

    ensureCanVoid(invoice);
    invoice.status = "void";
    invoice.updatedAt = nowIso();

    return successResponse(withComputedStatus(invoice), 200);
  } catch (error) {
    return handleRouteError(error);
  }
}
