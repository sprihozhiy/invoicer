import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { apiError, handleRouteError, parseBody, readJsonBody } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";
import { nowIso } from "@/lib/time";
import { CatalogCreateSchema } from "@/lib/validators";
import { uuid } from "@/lib/ids";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const catalogs = db
      .select()
      .from(catalogItems)
      .where(and(eq(catalogItems.userId, user.id), isNull(catalogItems.deletedAt)))
      .orderBy(asc(catalogItems.name))
      .all();

    return NextResponse.json({ catalogs }, { status: 200 });
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

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
