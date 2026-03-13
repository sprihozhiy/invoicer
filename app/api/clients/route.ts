import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { handleRouteError, paginatedResponse, parseBody, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uuid } from "@/lib/ids";
import { parsePagination } from "@/lib/pagination";
import { clients } from "@/lib/schema";
import { nowIso } from "@/lib/time";
import { ClientCreateSchema } from "@/lib/validators";

type ClientRow = typeof clients.$inferSelect;

function toClient(row: ClientRow) {
  const address = row.addressLine1 === null
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

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const search = (searchParams.get("search") ?? "").trim().toLowerCase();
    const { page, limit, offset } = parsePagination(searchParams.get("page"), searchParams.get("limit"));

    const filters = [eq(clients.userId, user.id)];
    if (search) {
      // REVIEW: `search` is not escaped for LIKE metacharacters (% and _). A user
      // supplying "%" would match all their clients. Consider escaping with a
      // replace + ESCAPE clause once drizzle-orm exposes that option.
      const pattern = `%${search}%`;
      filters.push(
        or(
          like(sql`lower(${clients.name})`, pattern),
          like(sql`lower(${clients.company})`, pattern),
          like(sql`lower(${clients.email})`, pattern),
        )!,
      );
    }

    const whereClause = and(...filters);
    const rows = db
      .select()
      .from(clients)
      .where(whereClause)
      .orderBy(desc(clients.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
    const totalRow = db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(whereClause)
      .get();

    return paginatedResponse(rows.map(toClient), {
      total: Number(totalRow?.count ?? 0),
      page,
      limit,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const body = await readJsonBody<unknown>(req);
    const parsed = parseBody(ClientCreateSchema, body);
    if (!parsed.ok) {
      return parsed.response;
    }
    const now = nowIso();

    const inserted = db
      .insert(clients)
      .values({
        id: uuid(),
        userId: user.id,
        name: parsed.data.name,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        company: parsed.data.company ?? null,
        addressLine1: parsed.data.address?.line1 ?? null,
        addressLine2: parsed.data.address?.line2 ?? null,
        addressCity: parsed.data.address?.city ?? null,
        addressState: parsed.data.address?.state ?? null,
        addressPostalCode: parsed.data.address?.postalCode ?? null,
        addressCountry: parsed.data.address?.country ?? null,
        currency: parsed.data.currency,
        notes: parsed.data.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return successResponse(toClient(inserted), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
