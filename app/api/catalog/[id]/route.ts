import { NextRequest } from "next/server";

import { actionResponse, apiError, handleRouteError, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { ensureInteger, ensureOptionalString, ensureString, ensureUuid } from "@/lib/validate";
import { nowIso } from "@/lib/time";
import { store } from "@/lib/store";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const itemId = ensureUuid(id, "id");

    const item = store.catalogItems.find((entry) => entry.id === itemId && entry.userId === user.id);
    if (!item) {
      apiError(404, "NOT_FOUND", "Catalog item not found.");
    }

    const body = await readJsonBody<Record<string, unknown>>(req);

    if ("name" in body) {
      const name = ensureString(body.name, "name", 1, 200);
      if (!name.trim()) {
        apiError(400, "VALIDATION_ERROR", "name cannot be empty.", "name");
      }
      item.name = name;
    }
    if ("description" in body) {
      item.description = ensureOptionalString(body.description, "description", 500) ?? null;
    }
    if ("unitPrice" in body) {
      item.unitPrice = ensureInteger(body.unitPrice, "unitPrice", 0);
    }
    if ("unit" in body) {
      item.unit = ensureOptionalString(body.unit, "unit", 20) ?? null;
    }
    if ("taxable" in body) {
      item.taxable = Boolean(body.taxable);
    }

    item.updatedAt = nowIso();

    return successResponse(item, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const itemId = ensureUuid(id, "id");

    const idx = store.catalogItems.findIndex((entry) => entry.id === itemId && entry.userId === user.id);
    if (idx < 0) {
      apiError(404, "NOT_FOUND", "Catalog item not found.");
    }

    store.catalogItems.splice(idx, 1);
    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
