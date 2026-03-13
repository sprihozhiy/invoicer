import { NextRequest } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";

import { actionResponse, apiError, handleRouteError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StoredInvoice, StoredInvoiceStatus } from "@/lib/models";
import { invoices, payments } from "@/lib/schema";
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

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string; paymentId: string }> }) {
  try {
    const user = requireAuth(req);
    const { id, paymentId } = await context.params;
    const invoiceId = ensureUuid(id, "id");
    const pid = ensureUuid(paymentId, "paymentId");

    const invoiceRow = db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id), isNull(invoices.deletedAt)),
      )
      .get();
    if (!invoiceRow) {
      apiError(404, "NOT_FOUND", "Invoice not found.");
    }

    const paymentRow = db
      .select()
      .from(payments)
      .where(and(eq(payments.id, pid), eq(payments.invoiceId, invoiceId)))
      .get();
    if (!paymentRow) {
      apiError(404, "NOT_FOUND", "Payment not found.");
    }

    db.transaction((tx) => {
      tx.delete(payments).where(eq(payments.id, pid)).run();

      const totalPaidResult = tx
        .select({ total: sql<number>`sum(${payments.amount})` })
        .from(payments)
        .where(eq(payments.invoiceId, invoiceId))
        .get();
      const totalPaid = Number(totalPaidResult?.total ?? 0);

      const invoice = toStoredInvoice(invoiceRow);
      const amountPaid = totalPaid;
      const amountDue = Math.max(0, invoice.total - totalPaid);

      let status: StoredInvoiceStatus;
      let paidAt: string | null;
      if (totalPaid === 0) {
        status = "sent";
        paidAt = null;
      } else if (totalPaid < invoice.total) {
        status = "partial";
        paidAt = null;
      } else {
        status = "paid";
        paidAt = invoice.paidAt;
      }

      const now = nowIso();
      tx.update(invoices)
        .set({ status, amountPaid, amountDue, paidAt, updatedAt: now })
        .where(eq(invoices.id, invoiceId))
        .run();
    });

    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
