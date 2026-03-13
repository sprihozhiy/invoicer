import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { actionResponse, apiError, handleRouteError, parseBody, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, invoices } from "@/lib/schema";
import { nowIso } from "@/lib/time";
import { ClientPatchSchema } from "@/lib/validators";

type ClientRow = typeof clients.$inferSelect;

function toClient(row: ClientRow) {
  const address =
    row.addressLine1 === null
      ? null
      : {
          line1: row.addressLine1,
          line2: row.addressLine2,
          city: row.addressCity ?? "",
          state: row.addressState,
          postalCode: row.addressPostalCode,
          country: row.addressCountry ?? "",
        };

  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    address,
    currency: row.currency,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;

    const clientRow = db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
      .get();
    if (!clientRow) {
      apiError(404, "NOT_FOUND", "Client not found.");
    }

    // Aggregate stats over non-deleted, non-void invoices
    const statsRow = db
      .select({
        totalInvoiced: sql<number>`coalesce(sum(${invoices.total}), 0)`,
        totalPaid: sql<number>`coalesce(sum(${invoices.amountPaid}), 0)`,
        lastInvoiceDate: sql<string | null>`max(${invoices.issueDate})`,
        invoiceCount: sql<number>`count(*)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.clientId, id),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
          ne(invoices.status, "void"),
        ),
      )
      .get();

    // Outstanding = sum of amount_due on unpaid invoices (sent or partial)
    const outstandingRow = db
      .select({ totalOutstanding: sql<number>`coalesce(sum(${invoices.amountDue}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.clientId, id),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
          inArray(invoices.status, ["sent", "partial"]),
        ),
      )
      .get();

    const stats = {
      totalInvoiced: Number(statsRow?.totalInvoiced ?? 0),
      totalPaid: Number(statsRow?.totalPaid ?? 0),
      totalOutstanding: Number(outstandingRow?.totalOutstanding ?? 0),
      lastInvoiceDate: statsRow?.lastInvoiceDate ?? null,
      invoiceCount: Number(statsRow?.invoiceCount ?? 0),
    };

    return successResponse({ ...toClient(clientRow!), stats });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;

    const exists = db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
      .get();
    if (!exists) {
      apiError(404, "NOT_FOUND", "Client not found.");
    }

    const body = await readJsonBody<unknown>(req);
    const parsed = parseBody(ClientPatchSchema, body);
    if (!parsed.ok) {
      return parsed.response;
    }

    const patch = parsed.data;
    const updates: Partial<typeof clients.$inferInsert> = { updatedAt: nowIso() };

    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.email !== undefined) updates.email = patch.email ?? null;
    if (patch.phone !== undefined) updates.phone = patch.phone ?? null;
    if (patch.company !== undefined) updates.company = patch.company ?? null;
    if (patch.currency !== undefined) updates.currency = patch.currency;
    if (patch.notes !== undefined) updates.notes = patch.notes ?? null;
    // Only touch address columns if `address` key was present in the request
    if ("address" in patch) {
      updates.addressLine1 = patch.address?.line1 ?? null;
      updates.addressLine2 = patch.address?.line2 ?? null;
      updates.addressCity = patch.address?.city ?? null;
      updates.addressState = patch.address?.state ?? null;
      updates.addressPostalCode = patch.address?.postalCode ?? null;
      updates.addressCountry = patch.address?.country ?? null;
    }

    const updated = db
      .update(clients)
      .set(updates)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
      .returning()
      .get();

    return successResponse(toClient(updated!));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;

    const clientRow = db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
      .get();
    if (!clientRow) {
      apiError(404, "NOT_FOUND", "Client not found.");
    }

    const hasNonVoidInvoice = db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.clientId, id),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
          ne(invoices.status, "void"),
        ),
      )
      .get();

    if (hasNonVoidInvoice) {
      apiError(409, "CLIENT_HAS_INVOICES", "Client has existing invoices.");
    }

    // invoices.clientId has no ON DELETE CASCADE, so remove the client's invoices
    // (all void/deleted) before deleting the client to avoid FK constraint failure.
    // Payments cascade automatically via invoices.
    db.delete(invoices).where(and(eq(invoices.clientId, id), eq(invoices.userId, user.id))).run();
    db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, user.id))).run();

    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
