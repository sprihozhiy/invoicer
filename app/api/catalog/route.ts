import { NextRequest } from "next/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { apiError, handleRouteError, parseBody, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";
import { nowIso } from "@/lib/time";
import { CatalogCreateSchema } from "@/lib/validators";
import { uuid } from "@/lib/ids";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const search = (req.nextUrl.searchParams.get("search") ?? "").trim().toLowerCase();
    const filters = [eq(catalogItems.userId, user.id), isNull(catalogItems.deletedAt)];
    if (search) {
      const pattern = `%${search}%`;
      filters.push(
        sql`(lower(${catalogItems.name}) like ${pattern} or lower(coalesce(${catalogItems.description}, '')) like ${pattern})`,
      );
    }
    const items = db
      .select()
      .from(catalogItems)
      .where(and(...filters))
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
      .where(and(eq(catalogItems.userId, user.id), isNull(catalogItems.deletedAt)))
      .get();
    if (Number(countRow?.count ?? 0) >= 500) {
      apiError(400, "CATALOG_LIMIT_EXCEEDED", "Catalog limit reached.");
    }

    const body = await readJsonBody<unknown>(req);
    const parsed = parseBody(CatalogCreateSchema, body);
    if (!parsed.ok) {
      return parsed.response;
    }

    const now = nowIso();
    const created = db
      .insert(catalogItems)
      .values({
        id: uuid(),
        userId: user.id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        unitPrice: parsed.data.unitPrice,
        unit: parsed.data.unit ?? null,
        taxable: parsed.data.taxable ?? false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .returning()
      .get();

    return successResponse(created, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
