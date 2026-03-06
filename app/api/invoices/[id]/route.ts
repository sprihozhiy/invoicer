import { NextRequest } from "next/server";

import { actionResponse, apiError, handleRouteError, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { ensureDueDateAfterIssue } from "@/lib/domain";
import { computeLineItems, computeTotals, ensureEditable, withComputedStatus } from "@/lib/invoices";
import { ensureCurrency, ensureDate, ensureNumber, ensureOptionalString, ensureString, ensureUuid } from "@/lib/validate";
import { nowIso } from "@/lib/time";
import { store } from "@/lib/store";

function parseUpdateLineItems(raw: unknown) {
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
      apiError(400, "VALIDATION_ERROR", "quantity supports up to 4 decimals.", `lineItems.${index}.quantity`);
    }
    const unitPrice = ensureNumber(item.unitPrice, `lineItems.${index}.unitPrice`);
    if (!Number.isInteger(unitPrice) || unitPrice < 0) {
      apiError(400, "VALIDATION_ERROR", "unitPrice must be an integer >= 0.", `lineItems.${index}.unitPrice`);
    }
    return {
      ...(item.id !== undefined ? { id: ensureUuid(item.id, `lineItems.${index}.id`) } : {}),
      description,
      quantity,
      unitPrice,
      taxable: item.taxable === undefined ? false : Boolean(item.taxable),
    };
  });
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const invoiceId = ensureUuid(id, "id");

    const invoice = store.invoices.find((item) => item.id === invoiceId && item.userId === user.id && item.deletedAt === null);
    if (!invoice) {
      apiError(404, "NOT_FOUND", "Invoice not found.");
    }

    return successResponse(withComputedStatus(invoice), 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const invoiceId = ensureUuid(id, "id");

    const invoice = store.invoices.find((item) => item.id === invoiceId && item.userId === user.id && item.deletedAt === null);
    if (!invoice) {
      apiError(404, "NOT_FOUND", "Invoice not found.");
    }

    ensureEditable(invoice);

    const body = await readJsonBody<Record<string, unknown>>(req);

    if ("clientId" in body) {
      const clientId = ensureUuid(body.clientId, "clientId");
      const client = store.clients.find((item) => item.id === clientId && item.userId === user.id);
      if (!client) {
        apiError(404, "NOT_FOUND", "Client not found.");
      }
      invoice.clientId = clientId;
    }

    if ("invoiceNumber" in body) {
      const invoiceNumber = ensureString(body.invoiceNumber, "invoiceNumber", 1, 50);
      const duplicate = store.invoices.some(
        (item) => item.id !== invoice.id && item.userId === user.id && item.deletedAt === null && item.invoiceNumber === invoiceNumber,
      );
      if (duplicate) {
        apiError(409, "DUPLICATE_INVOICE_NUMBER", "Invoice number already exists.");
      }
      invoice.invoiceNumber = invoiceNumber;
    }

    const issueDate = "issueDate" in body ? ensureDate(body.issueDate, "issueDate") : invoice.issueDate;
    const dueDate = "dueDate" in body ? ensureDate(body.dueDate, "dueDate") : invoice.dueDate;
    ensureDueDateAfterIssue(issueDate, dueDate);
    invoice.issueDate = issueDate;
    invoice.dueDate = dueDate;

    if ("currency" in body) {
      invoice.currency = ensureCurrency(body.currency, "currency");
    }

    if ("lineItems" in body) {
      invoice.lineItems = computeLineItems(parseUpdateLineItems(body.lineItems));
    }

    if ("taxRate" in body) {
      invoice.taxRate = body.taxRate === null ? null : ensureNumber(body.taxRate, "taxRate", 0);
    }

    if ("discountType" in body) {
      if (body.discountType === null) {
        invoice.discountType = null;
      } else {
        const discountType = ensureString(body.discountType, "discountType", 1, 20);
        if (discountType !== "percentage" && discountType !== "fixed") {
          apiError(400, "VALIDATION_ERROR", "Invalid discountType.", "discountType");
        }
        invoice.discountType = discountType;
      }
    }

    if ("discountValue" in body) {
      invoice.discountValue = ensureNumber(body.discountValue, "discountValue", 0);
    }

    if ("notes" in body) {
      invoice.notes = ensureOptionalString(body.notes, "notes", 5000) ?? null;
    }

    if ("terms" in body) {
      invoice.terms = ensureOptionalString(body.terms, "terms", 5000) ?? null;
    }

    const totals = computeTotals({
      lineItems: invoice.lineItems,
      taxRate: invoice.taxRate,
      discountType: invoice.discountType,
      discountValue: invoice.discountValue,
      amountPaid: invoice.amountPaid,
    });

    invoice.subtotal = totals.subtotal;
    invoice.taxAmount = totals.taxAmount;
    invoice.discountAmount = totals.discountAmount;
    invoice.total = totals.total;
    invoice.amountDue = totals.amountDue;
    invoice.updatedAt = nowIso();

    return successResponse(withComputedStatus(invoice), 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const invoiceId = ensureUuid(id, "id");

    const invoice = store.invoices.find((item) => item.id === invoiceId && item.userId === user.id && item.deletedAt === null);
    if (!invoice) {
      apiError(404, "NOT_FOUND", "Invoice not found.");
    }

    ensureEditable(invoice);

    invoice.deletedAt = nowIso();
    invoice.updatedAt = nowIso();
    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
