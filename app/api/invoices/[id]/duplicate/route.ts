import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { apiError, handleRouteError, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeInvoiceNumber, computeTotals, withComputedStatus } from "@/lib/invoices";
import { StoredInvoice, StoredInvoiceStatus } from "@/lib/models";
import { businessProfiles, invoices } from "@/lib/schema";
import { addDaysUtc, nowIso, todayUtc } from "@/lib/time";
import { uuid } from "@/lib/ids";
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

    const sourceRow = db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id), isNull(invoices.deletedAt)),
      )
      .get();
    if (!sourceRow) {
      apiError(404, "NOT_FOUND", "Invoice not found.");
    }

    const source = toStoredInvoice(sourceRow);
    const now = nowIso();
    const issueDate = todayUtc();

    const newInvoice = db.transaction((tx) => {
      const profile = tx
        .select()
        .from(businessProfiles)
        .where(eq(businessProfiles.userId, user.id))
        .get();
      if (!profile) {
        apiError(500, "INTERNAL_SERVER_ERROR", "Business profile not found.");
      }

      const dueDate = addDaysUtc(issueDate, profile.defaultPaymentTermsDays);
      const invoiceNumber = computeInvoiceNumber(profile.invoicePrefix, profile.nextInvoiceNumber);

      tx.update(businessProfiles)
        .set({ nextInvoiceNumber: profile.nextInvoiceNumber + 1, updatedAt: now })
        .where(eq(businessProfiles.id, profile.id))
        .run();

      const lineItems = source.lineItems.map((item) => ({ ...item, id: uuid() }));
      const totals = computeTotals({
        lineItems,
        taxRate: source.taxRate,
        discountType: source.discountType,
        discountValue: source.discountValue,
        amountPaid: 0,
      });

      const newId = uuid();
      const invoice = {
        id: newId,
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

      tx.insert(invoices).values(invoice).run();
      return invoice;
    });

    return successResponse(withComputedStatus(newInvoice as StoredInvoice), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
