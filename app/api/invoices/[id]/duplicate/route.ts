import { NextRequest } from "next/server";

import { apiError, handleRouteError, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/domain";
import { computeInvoiceNumber, computeTotals, withComputedStatus } from "@/lib/invoices";
import { ensureUuid } from "@/lib/validate";
import { addDaysUtc, nowIso, todayUtc } from "@/lib/time";
import { store } from "@/lib/store";
import { uuid } from "@/lib/ids";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const invoiceId = ensureUuid(id, "id");

    const source = store.invoices.find((item) => item.id === invoiceId && item.userId === user.id && item.deletedAt === null);
    if (!source) {
      apiError(404, "NOT_FOUND", "Invoice not found.");
    }

    const profile = getBusinessProfile(user.id);
    const now = nowIso();
    const issueDate = todayUtc();
    const dueDate = addDaysUtc(issueDate, profile.defaultPaymentTermsDays);
    const invoiceNumber = computeInvoiceNumber(profile.invoicePrefix, profile.nextInvoiceNumber);
    profile.nextInvoiceNumber += 1;
    profile.updatedAt = now;

    const lineItems = source.lineItems.map((item) => ({ ...item, id: uuid() }));
    const totals = computeTotals({
      lineItems,
      taxRate: source.taxRate,
      discountType: source.discountType,
      discountValue: source.discountValue,
      amountPaid: 0,
    });

    const invoice = {
      id: uuid(),
      userId: user.id,
      clientId: source.clientId,
      invoiceNumber,
      status: "draft" as const,
      issueDate,
      dueDate,
      currency: source.currency,
      lineItems,
      subtotal: totals.subtotal,
      taxRate: source.taxRate,
      taxAmount: totals.taxAmount,
      discountType: source.discountType,
      discountValue: source.discountValue,
      discountAmount: totals.discountAmount,
      total: totals.total,
      amountPaid: 0,
      amountDue: totals.total,
      notes: source.notes,
      terms: source.terms,
      sentAt: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    store.invoices.push(invoice);

    return successResponse(withComputedStatus(invoice), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
