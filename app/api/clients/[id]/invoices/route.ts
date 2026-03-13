import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { apiError, handleRouteError, paginatedResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInvoiceStatusFilter } from "@/lib/domain";
import { withComputedStatus } from "@/lib/invoices";
import { parsePagination } from "@/lib/pagination";
import { clients, invoices } from "@/lib/schema";
import { todayUtc } from "@/lib/time";
import type { StoredInvoice } from "@/lib/models";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;

    const clientRow = db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
      .get();
    if (!clientRow) {
      apiError(404, "NOT_FOUND", "Client not found.");
    }

    const params = req.nextUrl.searchParams;
    const { page, limit, offset } = parsePagination(params.get("page"), params.get("limit"));
    const status = parseInvoiceStatusFilter(params.get("status"));

    const baseFilters = [
      eq(invoices.userId, user.id),
      eq(invoices.clientId, id),
      isNull(invoices.deletedAt),
    ];

    if (status) {
      if (status === "overdue") {
        baseFilters.push(inArray(invoices.status, ["sent", "partial"]));
        baseFilters.push(lt(invoices.dueDate, todayUtc()));
      } else {
        baseFilters.push(eq(invoices.status, status));
      }
    }

    const whereClause = and(...baseFilters);

    const rows = db
      .select()
      .from(invoices)
      .where(whereClause)
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    const totalRow = db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(whereClause)
      .get();

    const clientName = clientRow!.name;
    const data = rows.map((row) => {
      const inv = withComputedStatus(row as unknown as StoredInvoice);
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        clientId: inv.clientId,
        clientName,
        total: inv.total,
        amountDue: inv.amountDue,
        currency: inv.currency,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        createdAt: inv.createdAt,
      };
    });

    return paginatedResponse(data, {
      total: Number(totalRow?.count ?? 0),
      page,
      limit,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
