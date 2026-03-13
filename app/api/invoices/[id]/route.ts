import { NextRequest } from "next/server";
import { and, eq, isNull, ne } from "drizzle-orm";

import { actionResponse, apiError, handleRouteError, readJsonBody, successResponse } from "@/lib/api";
import { parseBody } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureDueDateAfterIssue } from "@/lib/domain";
import { computeLineItems, computeTotals, withComputedStatus } from "@/lib/invoices";
import { StoredInvoice, StoredInvoiceStatus } from "@/lib/models";
import { clients, invoices } from "@/lib/schema";
import { nowIso } from "@/lib/time";
import { ensureUuid } from "@/lib/validate";
import { InvoicePatchSchema } from "@/lib/validators";
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

    return successResponse(withComputedStatus(toStoredInvoice(row)), 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    // Return 403 FORBIDDEN for non-draft invoices
    if (row.status !== "draft") {
      apiError(403, "FORBIDDEN", "Only draft invoices can be edited.");
    }

    const body = await readJsonBody<Record<string, unknown>>(req);
    const parsed = parseBody(InvoicePatchSchema, body);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;

    // Build update object from current values + patch
    let clientId = row.clientId;
    if (input.clientId !== undefined) {
      const clientRow = db
        .select()
        .from(clients)
        .where(and(eq(clients.id, input.clientId), eq(clients.userId, user.id)))
        .get();
      if (!clientRow) {
        apiError(404, "NOT_FOUND", "Client not found.");
      }
      clientId = input.clientId;
    }

    let invoiceNumber = row.invoiceNumber;
    if (input.invoiceNumber !== undefined) {
      const duplicate = db
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          and(
            ne(invoices.id, invoiceId),
            eq(invoices.userId, user.id),
            isNull(invoices.deletedAt),
            eq(invoices.invoiceNumber, input.invoiceNumber),
          ),
        )
        .get();
      if (duplicate) {
        apiError(409, "DUPLICATE_INVOICE_NUMBER", "Invoice number already exists.");
      }
      invoiceNumber = input.invoiceNumber;
    }

    const issueDate = input.issueDate ?? row.issueDate;
    const dueDate = input.dueDate ?? row.dueDate;
    ensureDueDateAfterIssue(issueDate, dueDate);

    const currency = input.currency ?? row.currency;
    const lineItems: LineItem[] =
      input.lineItems !== undefined
        ? computeLineItems(input.lineItems)
        : (row.lineItems as LineItem[]);

    const taxRate = input.taxRate !== undefined ? (input.taxRate ?? null) : (row.taxRate ?? null);
    const discountType =
      input.discountType !== undefined
        ? ((input.discountType ?? null) as "percentage" | "fixed" | null)
        : ((row.discountType ?? null) as "percentage" | "fixed" | null);
    const discountValue = input.discountValue ?? row.discountValue;
    const notes = input.notes !== undefined ? (input.notes ?? null) : (row.notes ?? null);
    const terms = input.terms !== undefined ? (input.terms ?? null) : (row.terms ?? null);

    const totals = computeTotals({
      lineItems,
      taxRate,
      discountType,
      discountValue,
      amountPaid: row.amountPaid,
    });

    const now = nowIso();

    db.update(invoices)
      .set({
        clientId,
        invoiceNumber,
        issueDate,
        dueDate,
        currency,
        lineItems,
        taxRate,
        taxAmount: totals.taxAmount,
        discountType,
        discountValue,
        discountAmount: totals.discountAmount,
        subtotal: totals.subtotal,
        total: totals.total,
        amountDue: totals.amountDue,
        notes,
        terms,
        updatedAt: now,
      })
      .where(eq(invoices.id, invoiceId))
      .run();

    const updated = db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .get()!;

    return successResponse(withComputedStatus(toStoredInvoice(updated)), 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    // Return 403 FORBIDDEN for non-draft invoices
    if (row.status !== "draft") {
      apiError(403, "FORBIDDEN", "Only draft invoices can be deleted.");
    }

    const now = nowIso();
    db.update(invoices)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(invoices.id, invoiceId))
      .run();

    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
