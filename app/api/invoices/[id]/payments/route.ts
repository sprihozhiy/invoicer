import { NextRequest } from "next/server";

import { apiError, handleRouteError, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { parsePaymentMethod } from "@/lib/domain";
import { ensureCanRecordPayment, updateStatusFromPayment, withComputedStatus } from "@/lib/invoices";
import { ensureDate, ensureInteger, ensureOptionalString, ensureUuid } from "@/lib/validate";
import { nowIso, todayUtc } from "@/lib/time";
import { store } from "@/lib/store";
import { uuid } from "@/lib/ids";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const invoiceId = ensureUuid(id, "id");

    const invoice = store.invoices.find((item) => item.id === invoiceId && item.userId === user.id && item.deletedAt === null);
    if (!invoice) {
      apiError(404, "NOT_FOUND", "Invoice not found.");
    }

    const payments = store.payments
      .filter((item) => item.invoiceId === invoice.id)
      .sort((a, b) => {
        if (a.paidAt === b.paidAt) {
          return a.createdAt < b.createdAt ? 1 : -1;
        }
        return a.paidAt < b.paidAt ? 1 : -1;
      });

    return successResponse(payments, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const invoiceId = ensureUuid(id, "id");

    const invoice = store.invoices.find((item) => item.id === invoiceId && item.userId === user.id && item.deletedAt === null);
    if (!invoice) {
      apiError(404, "NOT_FOUND", "Invoice not found.");
    }

    ensureCanRecordPayment(invoice);

    const body = await readJsonBody<Record<string, unknown>>(req);
    const amount = ensureInteger(body.amount, "amount", 1);
    if (amount > invoice.amountDue) {
      apiError(400, "VALIDATION_ERROR", "amount must be <= amountDue.", "amount");
    }

    const method = parsePaymentMethod(body.method);
    const paidAt = body.paidAt === undefined ? todayUtc() : ensureDate(body.paidAt, "paidAt");
    if (paidAt > todayUtc()) {
      apiError(400, "VALIDATION_ERROR", "paidAt cannot be in the future.", "paidAt");
    }

    const reference = ensureOptionalString(body.reference, "reference", 200) ?? null;
    const notes = ensureOptionalString(body.notes, "notes", 500) ?? null;

    const payment = {
      id: uuid(),
      invoiceId: invoice.id,
      amount,
      method,
      reference,
      notes,
      paidAt,
      createdAt: nowIso(),
    };

    store.payments.push(payment);

    const totalPaid = store.payments.filter((item) => item.invoiceId === invoice.id).reduce((sum, item) => sum + item.amount, 0);
    updateStatusFromPayment(invoice, totalPaid, paidAt);
    invoice.updatedAt = nowIso();

    return successResponse(
      {
        payment,
        invoice: withComputedStatus(invoice),
      },
      201,
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
