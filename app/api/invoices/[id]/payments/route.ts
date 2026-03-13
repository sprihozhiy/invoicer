import { NextRequest } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { apiError, handleRouteError, readJsonBody, successResponse } from "@/lib/api";
import { parseBody } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureCanRecordPayment, updateStatusFromPayment, withComputedStatus } from "@/lib/invoices";
import { StoredInvoice, StoredInvoiceStatus } from "@/lib/models";
import { invoices, payments } from "@/lib/schema";
import { nowIso, todayUtc } from "@/lib/time";
import { uuid } from "@/lib/ids";
import { ensureUuid } from "@/lib/validate";
import { PaymentCreateSchema } from "@/lib/validators";
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

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const invoiceId = ensureUuid(id, "id");

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

    const paymentRows = db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .orderBy(desc(payments.paidAt), desc(payments.createdAt))
      .all();

    return successResponse(paymentRows, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const invoiceId = ensureUuid(id, "id");

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

    const invoice = toStoredInvoice(invoiceRow);
    ensureCanRecordPayment(invoice);

    const body = await readJsonBody<Record<string, unknown>>(req);
    const parsed = parseBody(PaymentCreateSchema, body);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;

    if (input.amount > invoice.amountDue) {
      apiError(400, "VALIDATION_ERROR", "amount must be <= amountDue.", "amount");
    }

    const paidAt = input.paidAt ?? todayUtc();
    if (paidAt > todayUtc()) {
      apiError(400, "VALIDATION_ERROR", "paidAt cannot be in the future.", "paidAt");
    }

    const result = db.transaction((tx) => {
      const payment = {
        id: uuid(),
        invoiceId,
        amount: input.amount,
        method: input.method,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        paidAt,
        createdAt: nowIso(),
      };

      tx.insert(payments).values(payment).run();

      // Recalculate total paid
      const totalPaidResult = tx
        .select({ total: sql<number>`sum(${payments.amount})` })
        .from(payments)
        .where(eq(payments.invoiceId, invoiceId))
        .get();
      const totalPaid = Number(totalPaidResult?.total ?? 0);

      // Update invoice using updateStatusFromPayment logic
      const updatedInvoice = { ...invoice };
      updateStatusFromPayment(updatedInvoice, totalPaid, paidAt);

      const now = nowIso();
      tx.update(invoices)
        .set({
          status: updatedInvoice.status,
          amountPaid: updatedInvoice.amountPaid,
          amountDue: updatedInvoice.amountDue,
          paidAt: updatedInvoice.paidAt,
          updatedAt: now,
        })
        .where(eq(invoices.id, invoiceId))
        .run();

      const updatedRow = tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .get()!;

      return { payment, invoice: toStoredInvoice(updatedRow) };
    });

    return successResponse(
      {
        payment: result.payment,
        invoice: withComputedStatus(result.invoice),
      },
      201,
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
