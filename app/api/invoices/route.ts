import { NextRequest } from "next/server";

import { apiError, handleRouteError, paginatedResponse, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { ensureDueDateAfterIssue, getBusinessProfile, parseInvoiceSortBy, parseInvoiceStatusFilter, parseSortDir } from "@/lib/domain";
import { computeInvoiceNumber, computeLineItems, computeTotals, toSummary } from "@/lib/invoices";
import { parsePagination } from "@/lib/pagination";
import { ensureCurrency, ensureDate, ensureInteger, ensureNumber, ensureOptionalString, ensureString, ensureUuid } from "@/lib/validate";
import { nowIso, todayUtc } from "@/lib/time";
import { store } from "@/lib/store";
import { uuid } from "@/lib/ids";

function parseLineItems(raw: unknown): Array<{ id?: string; description: string; quantity: number; unitPrice: number; taxable?: boolean }> {
  if (!Array.isArray(raw) || raw.length === 0) {
    apiError(400, "VALIDATION_ERROR", "At least one line item is required.", "lineItems");
  }
  return raw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      apiError(400, "VALIDATION_ERROR", "line item must be an object.", `lineItems.${index}`);
    }
    const item = entry as Record<string, unknown>;
    const description = ensureString(item.description, `lineItems.${index}.description`, 1, 2000);
    const quantity = ensureNumber(item.quantity, `lineItems.${index}.quantity`);
    if (quantity <= 0) {
      apiError(400, "VALIDATION_ERROR", "quantity must be > 0.", `lineItems.${index}.quantity`);
    }
    if (Math.round(quantity * 10000) !== quantity * 10000) {
      apiError(400, "VALIDATION_ERROR", "quantity supports up to 4 decimal places.", `lineItems.${index}.quantity`);
    }
    const unitPrice = ensureInteger(item.unitPrice, `lineItems.${index}.unitPrice`, 0);
    const taxable = item.taxable === undefined ? false : Boolean(item.taxable);

    return {
      description,
      quantity,
      unitPrice,
      taxable,
      ...(item.id ? { id: ensureUuid(item.id, `lineItems.${index}.id`) } : {}),
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const params = req.nextUrl.searchParams;
    const { page, limit, offset } = parsePagination(params.get("page"), params.get("limit"));
    const status = parseInvoiceStatusFilter(params.get("status"));
    const search = (params.get("search") ?? "").trim().toLowerCase();
    const clientId = params.get("clientId");
    const sortBy = parseInvoiceSortBy(params.get("sortBy"));
    const sortDir = parseSortDir(params.get("sortDir"));

    let invoices = store.invoices.filter((item) => item.userId === user.id && item.deletedAt === null);

    if (status) {
      if (status === "overdue") {
        invoices = invoices.filter((item) => (item.status === "sent" || item.status === "partial") && item.dueDate < todayUtc());
      } else {
        invoices = invoices.filter((item) => item.status === status);
      }
    }

    if (clientId) {
      const id = ensureUuid(clientId, "clientId");
      invoices = invoices.filter((item) => item.clientId === id);
    }

    if (search) {
      invoices = invoices.filter((invoice) => {
        const clientName = store.clients.find((client) => client.id === invoice.clientId)?.name ?? "";
        return invoice.invoiceNumber.toLowerCase().includes(search) || clientName.toLowerCase().includes(search);
      });
    }

    invoices.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === bv) {
        return 0;
      }
      const direction = sortDir === "asc" ? 1 : -1;
      return av > bv ? direction : -direction;
    });

    const data = invoices.slice(offset, offset + limit).map((invoice) => {
      const clientName = store.clients.find((client) => client.id === invoice.clientId)?.name ?? "Unknown Client";
      return toSummary(invoice, clientName);
    });

    return paginatedResponse(data, {
      total: invoices.length,
      page,
      limit,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const body = await readJsonBody<Record<string, unknown>>(req);

    const clientId = ensureUuid(body.clientId, "clientId");
    const client = store.clients.find((item) => item.id === clientId && item.userId === user.id);
    if (!client) {
      apiError(404, "NOT_FOUND", "Client not found.");
    }

    const issueDate = ensureDate(body.issueDate, "issueDate");
    const dueDate = ensureDate(body.dueDate, "dueDate");
    ensureDueDateAfterIssue(issueDate, dueDate);

    const lineItems = computeLineItems(parseLineItems(body.lineItems));
    const taxRate = body.taxRate === undefined || body.taxRate === null ? null : ensureNumber(body.taxRate, "taxRate", 0);
    const discountType: "percentage" | "fixed" | null =
      body.discountType === undefined || body.discountType === null
        ? null
        : (() => {
            const dt = ensureString(body.discountType, "discountType", 1, 20);
            if (dt !== "percentage" && dt !== "fixed") {
              apiError(400, "VALIDATION_ERROR", "Invalid discountType.", "discountType");
            }
            return dt as "percentage" | "fixed";
          })();
    const discountValue = body.discountValue === undefined ? 0 : ensureNumber(body.discountValue, "discountValue", 0);

    const currency = body.currency === undefined ? client.currency : ensureCurrency(body.currency, "currency");

    const profile = getBusinessProfile(user.id);

    let invoiceNumber = body.invoiceNumber ? ensureString(body.invoiceNumber, "invoiceNumber", 1, 50) : undefined;
    if (!invoiceNumber) {
      invoiceNumber = computeInvoiceNumber(profile.invoicePrefix, profile.nextInvoiceNumber);
      profile.nextInvoiceNumber += 1;
      profile.updatedAt = nowIso();
    }

    const duplicate = store.invoices.some(
      (invoice) => invoice.userId === user.id && invoice.deletedAt === null && invoice.invoiceNumber === invoiceNumber,
    );
    if (duplicate) {
      apiError(409, "DUPLICATE_INVOICE_NUMBER", "Invoice number already exists.");
    }

    const totals = computeTotals({
      lineItems,
      taxRate,
      discountType,
      discountValue,
      amountPaid: 0,
    });

    const now = nowIso();
    const invoice = {
      id: uuid(),
      userId: user.id,
      clientId: client.id,
      invoiceNumber,
      status: "draft" as const,
      issueDate,
      dueDate,
      currency,
      lineItems,
      subtotal: totals.subtotal,
      taxRate,
      taxAmount: totals.taxAmount,
      discountType,
      discountValue,
      discountAmount: totals.discountAmount,
      total: totals.total,
      amountPaid: 0,
      amountDue: totals.total,
      notes: ensureOptionalString(body.notes, "notes", 5000) ?? null,
      terms: ensureOptionalString(body.terms, "terms", 5000) ?? null,
      sentAt: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    store.invoices.push(invoice);

    return successResponse(
      {
        ...invoice,
        status: "draft",
      },
      201,
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
