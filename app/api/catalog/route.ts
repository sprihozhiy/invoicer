import { NextRequest } from "next/server";

import { apiError, handleRouteError, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { ensureInteger, ensureOptionalString, ensureString } from "@/lib/validate";
import { nowIso } from "@/lib/time";
import { store } from "@/lib/store";
import { uuid } from "@/lib/ids";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const search = (req.nextUrl.searchParams.get("search") ?? "").trim().toLowerCase();

    let items = store.catalogItems.filter((item) => item.userId === user.id);
    if (search) {
      items = items.filter((item) => {
        return [item.name, item.description ?? ""].some((value) => value.toLowerCase().includes(search));
      });
    }

    items.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1));

    return successResponse(items, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const count = store.catalogItems.filter((item) => item.userId === user.id).length;
    if (count >= 500) {
      apiError(400, "CATALOG_LIMIT_EXCEEDED", "Catalog limit reached.");
    }

    const body = await readJsonBody<Record<string, unknown>>(req);
    const name = ensureString(body.name, "name", 1, 200);
    const unitPrice = ensureInteger(body.unitPrice, "unitPrice", 0);

    const now = nowIso();
    const item = {
      id: uuid(),
      userId: user.id,
      name,
      description: ensureOptionalString(body.description, "description", 500) ?? null,
      unitPrice,
      unit: ensureOptionalString(body.unit, "unit", 20) ?? null,
      taxable: body.taxable === undefined ? false : Boolean(body.taxable),
      createdAt: now,
      updatedAt: now,
    };

    store.catalogItems.push(item);
    return successResponse(item, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
