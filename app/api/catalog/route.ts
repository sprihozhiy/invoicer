import { NextRequest } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";

import { apiError, handleRouteError, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureInteger, ensureOptionalString, ensureString } from "@/lib/validate";
import { nowIso } from "@/lib/time";
import { catalogItems } from "@/lib/schema";
import { uuid } from "@/lib/ids";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const search = (req.nextUrl.searchParams.get("search") ?? "").trim().toLowerCase();
    const filters = [eq(catalogItems.userId, user.id)];
    if (search) {
      const pattern = `%${search}%`;
      filters.push(
        sql`(lower(${catalogItems.name}) like ${pattern} or lower(coalesce(${catalogItems.description}, '')) like ${pattern})`,
      );
    }
    const whereClause = and(...filters);
    const items = db
      .select()
      .from(catalogItems)
      .where(whereClause)
      .orderBy(asc(catalogItems.name))
      .all();

    return successResponse(items, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const countRow = db
      .select({ count: sql<number>`count(*)` })
      .from(catalogItems)
      .where(eq(catalogItems.userId, user.id))
      .get();
    if (Number(countRow?.count ?? 0) >= 500) {
      apiError(400, "CATALOG_LIMIT_EXCEEDED", "Catalog limit reached.");
    }

    const body = await readJsonBody<Record<string, unknown>>(req);
    const name = ensureString(body.name, "name", 1, 200);
    const unitPrice = ensureInteger(body.unitPrice, "unitPrice", 0);

    const now = nowIso();
    const item = db
      .insert(catalogItems)
      .values({
        id: uuid(),
        userId: user.id,
        name,
        description: ensureOptionalString(body.description, "description", 500) ?? null,
        unitPrice,
        unit: ensureOptionalString(body.unit, "unit", 20) ?? null,
        taxable: body.taxable === undefined ? false : Boolean(body.taxable),
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return successResponse(item, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
