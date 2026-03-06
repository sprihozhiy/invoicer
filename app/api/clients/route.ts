import { NextRequest } from "next/server";

import { handleRouteError, paginatedResponse, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { parseClientCreate } from "@/lib/domain";
import { parsePagination } from "@/lib/pagination";
import { nowIso } from "@/lib/time";
import { store } from "@/lib/store";
import { uuid } from "@/lib/ids";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const search = (searchParams.get("search") ?? "").trim().toLowerCase();
    const { page, limit, offset } = parsePagination(searchParams.get("page"), searchParams.get("limit"));

    let clients = store.clients.filter((item) => item.userId === user.id);
    if (search) {
      clients = clients.filter((item) => {
        return [item.name, item.email ?? "", item.company ?? ""].some((value) => value.toLowerCase().includes(search));
      });
    }

    clients.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return paginatedResponse(clients.slice(offset, offset + limit), {
      total: clients.length,
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
    const body = await readJsonBody<Record<string, unknown>>(req);
    const input = parseClientCreate(body, user);
    const now = nowIso();

    const client = {
      id: uuid(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    store.clients.push(client);
    return successResponse(client, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
