import { NextRequest } from "next/server";

import { apiError, handleRouteError, paginatedResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { parseInvoiceStatusFilter } from "@/lib/domain";
import { toSummary } from "@/lib/invoices";
import { parsePagination } from "@/lib/pagination";
import { ensureUuid } from "@/lib/validate";
import { todayUtc } from "@/lib/time";
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

    const params = req.nextUrl.searchParams;
    const { page, limit, offset } = parsePagination(params.get("page"), params.get("limit"));
    const status = parseInvoiceStatusFilter(params.get("status"));

    let invoices = store.invoices.filter((item) => item.userId === user.id && item.clientId === clientId && item.deletedAt === null);
    if (status) {
      if (status === "overdue") {
        invoices = invoices.filter((item) => (item.status === "sent" || item.status === "partial") && item.dueDate < todayUtc());
      } else {
        invoices = invoices.filter((item) => item.status === status);
      }
    }

    invoices.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const data = invoices.slice(offset, offset + limit).map((invoice) => toSummary(invoice, client.name));

    return paginatedResponse(data, {
      total: invoices.length,
      page,
      limit,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
