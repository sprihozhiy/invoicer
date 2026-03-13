import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { actionResponse, apiError, handleRouteError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureCanVoid } from "@/lib/invoices";
import { StoredInvoice, StoredInvoiceStatus } from "@/lib/models";
import { invoices } from "@/lib/schema";
import { nowIso } from "@/lib/time";
import { ensureUuid } from "@/lib/validate";
import type { LineItem } from "@/lib/models";

function toStoredInvoice(row: typeof invoices.$inferSelect): StoredInvoice {
  return {
    id: row.id,
    userId: row.userId,
    clientId: row.clientId,
    invoiceNumber: row.invoiceNumber,
    status: row.status as StoredInvoiceStatus,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    currency: row.currency,
    lineItems: row.lineItems as LineItem[],
    subtotal: row.subtotal,
    taxRate: row.taxRate ?? null,
    taxAmount: row.taxAmount,
    discountType: (row.discountType ?? null) as "percentage" | "fixed" | null,
    discountValue: row.discountValue,
    discountAmount: row.discountAmount,
    total: row.total,
    amountPaid: row.amountPaid,
    amountDue: row.amountDue,
    notes: row.notes ?? null,
    terms: row.terms ?? null,
    sentAt: row.sentAt ?? null,
    paidAt: row.paidAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  };
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const invoiceId = ensureUuid(id, "id");

    const row = db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id), isNull(invoices.deletedAt)),
      )
      .get();
    if (!row) {
      apiError(404, "NOT_FOUND", "Invoice not found.");
    }

    const invoice = toStoredInvoice(row);
    ensureCanVoid(invoice);

    const now = nowIso();
    db.update(invoices)
      .set({ status: "void", updatedAt: now })
      .where(eq(invoices.id, invoiceId))
      .run();

    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
