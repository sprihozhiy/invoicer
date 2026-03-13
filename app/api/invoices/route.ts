import { NextRequest } from "next/server";
import { and, asc, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";

import { apiError, handleRouteError, paginatedResponse, readJsonBody, successResponse } from "@/lib/api";
import { parseBody } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureDueDateAfterIssue, parseInvoiceSortBy, parseInvoiceStatusFilter, parseSortDir } from "@/lib/domain";
import { computeInvoiceNumber, computeLineItems, computeTotals, toSummary } from "@/lib/invoices";
import { StoredInvoice, StoredInvoiceStatus } from "@/lib/models";
import { parsePagination } from "@/lib/pagination";
import { businessProfiles, clients, invoices } from "@/lib/schema";
import { nowIso, todayUtc } from "@/lib/time";
import { uuid } from "@/lib/ids";
import { ensureUuid } from "@/lib/validate";
import { InvoiceCreateSchema } from "@/lib/validators";
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

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const params = req.nextUrl.searchParams;
    const { page, limit, offset } = parsePagination(params.get("page"), params.get("limit"));
    const status = parseInvoiceStatusFilter(params.get("status"));
    const search = (params.get("search") ?? "").trim().toLowerCase();
    const clientIdParam = params.get("clientId");
    const sortBy = parseInvoiceSortBy(params.get("sortBy"));
    const sortDir = parseSortDir(params.get("sortDir"));

    const today = todayUtc();

    // Build conditions
    const conditions = [eq(invoices.userId, user.id), isNull(invoices.deletedAt)];

    if (status) {
      if (status === "overdue") {
        conditions.push(
          inArray(invoices.status, ["sent", "partial"]),
          sql`${invoices.dueDate} < ${today}`,
        );
      } else {
        conditions.push(eq(invoices.status, status));
      }
    }

    if (clientIdParam) {
      conditions.push(eq(invoices.clientId, ensureUuid(clientIdParam, "clientId")));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          like(sql`lower(${invoices.invoiceNumber})`, pattern),
          like(sql`lower(${clients.name})`, pattern),
        )!,
      );
    }

    // Sort column mapping
    const sortColumnMap = {
      createdAt: invoices.createdAt,
      dueDate: invoices.dueDate,
      total: invoices.total,
      invoiceNumber: invoices.invoiceNumber,
    } as const;
    const sortColumn = sortColumnMap[sortBy];
    const orderFn = sortDir === "asc" ? asc : desc;

    // Count query
    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(...conditions))
      .get();
    const total = Number(countResult?.count ?? 0);

    // Data query
    const rows = db
      .select({ invoice: invoices, clientName: clients.name })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset)
      .all();

    const data = rows.map(({ invoice: row, clientName }) => {
      const inv = toStoredInvoice(row);
      return toSummary(inv, clientName);
    });

    return paginatedResponse(data, { total, page, limit });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const body = await readJsonBody<Record<string, unknown>>(req);

    const parsed = parseBody(InvoiceCreateSchema, body);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;

    ensureDueDateAfterIssue(input.issueDate, input.dueDate);

    // Validate client belongs to user
    const client = db
      .select()
      .from(clients)
      .where(and(eq(clients.id, input.clientId), eq(clients.userId, user.id)))
      .get();
    if (!client) {
      apiError(404, "NOT_FOUND", "Client not found.");
    }

    const profile = db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, user.id))
      .get();
    if (!profile) {
      apiError(500, "INTERNAL_SERVER_ERROR", "Business profile not found.");
    }

    const currency = input.currency ?? profile.defaultCurrency;

    const lineItems = computeLineItems(input.lineItems);
    const totals = computeTotals({
      lineItems,
      taxRate: input.taxRate ?? null,
      discountType: input.discountType ?? null,
      discountValue: input.discountValue ?? 0,
      amountPaid: 0,
    });

    const now = nowIso();

    // Atomic transaction to get/increment nextInvoiceNumber
    const invoice = db.transaction((tx) => {
      const profileInTx = tx
        .select()
        .from(businessProfiles)
        .where(eq(businessProfiles.userId, user.id))
        .get();
      if (!profileInTx) {
        apiError(500, "INTERNAL_SERVER_ERROR", "Business profile not found.");
      }

      let invoiceNumber = input.invoiceNumber;
      if (!invoiceNumber) {
        invoiceNumber = computeInvoiceNumber(profileInTx.invoicePrefix, profileInTx.nextInvoiceNumber);
        tx
          .update(businessProfiles)
          .set({ nextInvoiceNumber: profileInTx.nextInvoiceNumber + 1, updatedAt: now })
          .where(eq(businessProfiles.id, profileInTx.id))
          .run();
      }

      // Check for duplicate invoice number
      const duplicate = tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          and(
            eq(invoices.userId, user.id),
            isNull(invoices.deletedAt),
            eq(invoices.invoiceNumber, invoiceNumber),
          ),
        )
        .get();
      if (duplicate) {
        apiError(409, "DUPLICATE_INVOICE_NUMBER", "Invoice number already exists.");
      }

      const id = uuid();
      const newInvoice = {
        id,
        userId: user.id,
        clientId: client.id,
        invoiceNumber,
        status: "draft" as const,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        currency,
        lineItems,
        subtotal: totals.subtotal,
        taxRate: input.taxRate ?? null,
        taxAmount: totals.taxAmount,
        discountType: input.discountType ?? null,
        discountValue: input.discountValue ?? 0,
        discountAmount: totals.discountAmount,
        total: totals.total,
        amountPaid: 0,
        amountDue: totals.total,
        notes: input.notes ?? null,
        terms: input.terms ?? null,
        sentAt: null,
        paidAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      tx.insert(invoices).values(newInvoice).run();
      return newInvoice;
    });

    return successResponse(invoice, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
