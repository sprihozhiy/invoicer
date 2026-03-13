import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { actionResponse, apiError, handleRouteError, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureInteger, ensureOptionalString, ensureString, ensureUuid } from "@/lib/validate";
import { nowIso } from "@/lib/time";
import { catalogItems } from "@/lib/schema";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const itemId = ensureUuid(id, "id");

    const item = db
      .select()
      .from(catalogItems)
      .where(and(eq(catalogItems.id, itemId), eq(catalogItems.userId, user.id)))
      .get();
    if (!item) {
      apiError(404, "NOT_FOUND", "Catalog item not found.");
    }

    const body = await readJsonBody<Record<string, unknown>>(req);
    const changes: Partial<typeof catalogItems.$inferInsert> = {};

    if ("name" in body) {
      const name = ensureString(body.name, "name", 1, 200);
      if (!name.trim()) {
        apiError(400, "VALIDATION_ERROR", "name cannot be empty.", "name");
      }
      changes.name = name;
    }
    if ("description" in body) {
      changes.description = ensureOptionalString(body.description, "description", 500) ?? null;
    }
    if ("unitPrice" in body) {
      changes.unitPrice = ensureInteger(body.unitPrice, "unitPrice", 0);
    }
    if ("unit" in body) {
      changes.unit = ensureOptionalString(body.unit, "unit", 20) ?? null;
    }
    if ("taxable" in body) {
      changes.taxable = Boolean(body.taxable);
    }

    changes.updatedAt = nowIso();

    const updatedItem = db
      .update(catalogItems)
      .set(changes)
      .where(and(eq(catalogItems.id, itemId), eq(catalogItems.userId, user.id)))
      .returning()
      .get();
    if (!updatedItem) {
      apiError(404, "NOT_FOUND", "Catalog item not found.");
    }

    return successResponse(updatedItem, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const itemId = ensureUuid(id, "id");

    const deleted = db
      .delete(catalogItems)
      .where(and(eq(catalogItems.id, itemId), eq(catalogItems.userId, user.id)))
      .run();
    if (!deleted.changes) {
      apiError(404, "NOT_FOUND", "Catalog item not found.");
    }

    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
