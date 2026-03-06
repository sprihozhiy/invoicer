import { NextRequest } from "next/server";

import { actionResponse, apiError, handleRouteError, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { applyClientPatch } from "@/lib/domain";
import { ensureUuid } from "@/lib/validate";
import { store } from "@/lib/store";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const clientId = ensureUuid(id, "id");

    const client = store.clients.find((item) => item.id === clientId && item.userId === user.id);
    if (!client) {
      apiError(404, "NOT_FOUND", "Client not found.");
    }

    const invoices = store.invoices.filter(
      (invoice) => invoice.clientId === client.id && invoice.userId === user.id && invoice.deletedAt === null && invoice.status !== "void",
    );
    const payments = store.payments.filter((payment) => invoices.some((invoice) => invoice.id === payment.invoiceId));

    const totalInvoiced = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalOutstanding = Math.max(0, totalInvoiced - totalPaid);

    const lastInvoiceDate = invoices.length === 0
      ? null
      : invoices
          .map((invoice) => invoice.issueDate)
          .sort((a, b) => (a < b ? 1 : -1))[0];

    return successResponse(
      {
        ...client,
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        lastInvoiceDate,
      },
      200,
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const clientId = ensureUuid(id, "id");
    const body = await readJsonBody<Record<string, unknown>>(req);

    const client = store.clients.find((item) => item.id === clientId && item.userId === user.id);
    if (!client) {
      apiError(404, "NOT_FOUND", "Client not found.");
    }

    applyClientPatch(client, body);
    return successResponse(client, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const clientId = ensureUuid(id, "id");

    const idx = store.clients.findIndex((item) => item.id === clientId && item.userId === user.id);
    if (idx === -1) {
      apiError(404, "NOT_FOUND", "Client not found.");
    }

    const hasNonVoidInvoice = store.invoices.some(
      (invoice) => invoice.clientId === clientId && invoice.userId === user.id && invoice.deletedAt === null && invoice.status !== "void",
    );
    if (hasNonVoidInvoice) {
      apiError(409, "CLIENT_HAS_INVOICES", "Client has existing invoices.");
    }

    store.clients.splice(idx, 1);
    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
