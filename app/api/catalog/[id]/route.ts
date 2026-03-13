import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { apiError, handleRouteError, parseBody, readJsonBody } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";
import { nowIso } from "@/lib/time";
import { ensureUuid } from "@/lib/validate";
import { CatalogPatchSchema } from "@/lib/validators";

function getCatalogOrFail(userId: string, id: string) {
  const catalog = db
    .select()
    .from(catalogItems)
    .where(
      and(
        eq(catalogItems.id, id),
        eq(catalogItems.userId, userId),
        isNull(catalogItems.deletedAt),
      ),
    )
    .get();

  if (!catalog) {
    apiError(404, "NOT_FOUND", "Catalog item not found.");
  }

  return catalog;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const catalogId = ensureUuid(id, "id");

    const catalog = getCatalogOrFail(user.id, catalogId);
    return NextResponse.json(catalog, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const catalogId = ensureUuid(id, "id");
    getCatalogOrFail(user.id, catalogId);

    const body = await readJsonBody<unknown>(req);
    const parsed = parseBody(CatalogPatchSchema, body);
    if (!parsed.ok) {
      return parsed.response;
    }
    const patch = parsed.data;

    const changes: Partial<typeof catalogItems.$inferInsert> = { updatedAt: nowIso() };
    if (patch.name !== undefined) changes.name = patch.name;
    if (patch.description !== undefined) changes.description = patch.description ?? null;
    if (patch.unitPrice !== undefined) changes.unitPrice = patch.unitPrice;
    if (patch.unit !== undefined) changes.unit = patch.unit ?? null;
    if (patch.taxable !== undefined) changes.taxable = patch.taxable;

    const updatedItem = db
      .update(catalogItems)
      .set(changes)
      .where(
        and(
          eq(catalogItems.id, catalogId),
          eq(catalogItems.userId, user.id),
          isNull(catalogItems.deletedAt),
        ),
      )
      .returning()
      .get();
    if (!updatedItem) {
      apiError(404, "NOT_FOUND", "Catalog item not found.");
    }

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    const catalogId = ensureUuid(id, "id");
    getCatalogOrFail(user.id, catalogId);

    db.update(catalogItems)
      .set({ deletedAt: nowIso(), updatedAt: nowIso() })
      .where(
        and(
          eq(catalogItems.id, catalogId),
          eq(catalogItems.userId, user.id),
          isNull(catalogItems.deletedAt),
        ),
      )
      .run();

    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
