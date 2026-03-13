import { NextRequest } from "next/server";
import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, sql } from "drizzle-orm";

import { handleRouteError, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBusinessProfile as getProfileOrFail } from "@/lib/domain";
import { toSummary, withComputedStatus } from "@/lib/invoices";
import { StoredInvoice, StoredInvoiceStatus } from "@/lib/models";
import { clients, invoices, payments } from "@/lib/schema";
import { endOfMonthUtc, startOfMonthUtc, todayUtc } from "@/lib/time";

type InvoiceRow = typeof invoices.$inferSelect;

function toStoredInvoice(row: InvoiceRow): StoredInvoice {
  return {
    id: row.id,
    userId: row.userId,
    clientId: row.clientId,
    invoiceNumber: row.invoiceNumber,
    status: row.status as StoredInvoiceStatus,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    currency: row.currency,
    lineItems: row.lineItems,
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

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const profile = getProfileOrFail(user.id);
    const today = todayUtc();
    const firstOfMonth = startOfMonthUtc().toISOString().slice(0, 10);
    const lastOfMonth = endOfMonthUtc().toISOString().slice(0, 10);

    const outstandingRow = db
      .select({ total: sql<number>`coalesce(sum(${invoices.amountDue}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
          inArray(invoices.status, ["sent", "partial"]),
          eq(invoices.currency, profile.defaultCurrency),
        ),
      )
      .get();

    const overdueRow = db
      .select({ total: sql<number>`coalesce(sum(${invoices.amountDue}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
          inArray(invoices.status, ["sent", "partial"]),
          lt(invoices.dueDate, today),
          eq(invoices.currency, profile.defaultCurrency),
        ),
      )
      .get();

    const paidThisMonthRow = db
      .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.userId, user.id),
          eq(invoices.currency, profile.defaultCurrency),
          gte(payments.paidAt, firstOfMonth),
          lte(payments.paidAt, lastOfMonth),
        ),
      )
      .get();

    const recentRows = db
      .select({ invoice: invoices, clientName: clients.name })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.userId, user.id), isNull(invoices.deletedAt)))
      .orderBy(desc(invoices.createdAt))
      .limit(5)
      .all();

    const overdueRows = db
      .select({ invoice: invoices, clientName: clients.name })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(
        and(
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
          inArray(invoices.status, ["sent", "partial"]),
          lt(invoices.dueDate, today),
        ),
      )
      .orderBy(asc(invoices.dueDate))
      .all();

    const recentInvoices = recentRows.map(({ invoice, clientName }) => {
      const stored = toStoredInvoice(invoice);
      const computed = withComputedStatus(stored);
      const summary = toSummary(stored, clientName);
      return { ...summary, status: computed.status };
    });

    const overdueInvoices = overdueRows.map(({ invoice, clientName }) => {
      const stored = toStoredInvoice(invoice);
      const computed = withComputedStatus(stored);
      const summary = toSummary(stored, clientName);
      return { ...summary, status: computed.status };
    });

    return successResponse(
      {
        totalOutstanding: Number(outstandingRow?.total ?? 0),
        totalOverdue: Number(overdueRow?.total ?? 0),
        paidThisMonth: Number(paidThisMonthRow?.total ?? 0),
        recentInvoices,
        overdueInvoices,
      },
      200,
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
